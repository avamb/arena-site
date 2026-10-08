/**
 * One-off, repeatable import of the WordPress blog (doc 33 §3.3): posts in every language through
 * the REST API → content/<lang>/posts/<slug>.md with frontmatter, images downloaded next to the
 * posts, internal links rewritten to the new addresses, old address kept as `legacy_url` (301).
 * Article text is not edited (archive policy); only markup is converted and links fixed.
 *
 *   node scripts/import-wordpress.mjs            # all languages
 *   node scripts/import-wordpress.mjs en ru      # some
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import sharp from 'sharp';
import { pageRedirects, mapLegacyUrl } from './lib/legacy.mjs';

const ORIGIN = 'https://arenasoldout.com';
const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['en', 'ru', 'es', 'no'];
const MAX_WIDTH = 1600;

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
td.use(gfm);
td.remove(['script', 'style', 'iframe', 'noscript']);
// WordPress wraps figures; keep the image and the caption as plain text.
td.addRule('figure', { filter: 'figure', replacement: (content) => `\n\n${content.trim()}\n\n` });
td.addRule('figcaption', { filter: 'figcaption', replacement: (content) => `\n*${content.trim()}*\n` });
td.addRule('span', { filter: ['span', 'font'], replacement: (content) => content });

const decode = (s) => s.replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘').replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&#8230;|&hellip;/g, '…').replace(/&#038;|&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const yamlStr = (s) => JSON.stringify(s);

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'arena-site-import/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const mediaCache = new Map();
async function media(id) {
  if (!id) return null;
  if (mediaCache.has(id)) return mediaCache.get(id);
  try {
    const m = await fetchJson(`${ORIGIN}/wp-json/wp/v2/media/${id}?_fields=source_url,alt_text,media_details`);
    mediaCache.set(id, m);
    return m;
  } catch { mediaCache.set(id, null); return null; }
}

async function download(url, dir, slugHint) {
  const clean = url.split('?')[0];
  // Prefer the original file over WordPress size variants (-1024x683), then resize ourselves.
  const original = clean.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, '$1');
  let name = basename(original).toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  if (!extname(name)) name += '.jpg';
  const target = join(dir, name);
  if (existsSync(target)) return name;
  let res = await fetch(original);
  if (!res.ok) res = await fetch(clean);
  if (!res.ok) { console.warn(`  image missing: ${url}`); return null; }
  let buf = Buffer.from(await res.arrayBuffer());
  try {
    const img = sharp(buf);
    const meta = await img.metadata();
    if ((meta.width ?? 0) > MAX_WIDTH || buf.length > 600_000) {
      const ext = extname(name).toLowerCase();
      buf = await img.resize({ width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })[ext === '.png' ? 'png' : ext === '.webp' ? 'webp' : 'jpeg']({ quality: 82 }).toBuffer();
    }
  } catch { /* keep as downloaded */ }
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, buf);
  return name;
}

async function run() {
  const redirects = pageRedirects();
  // First pass: collect every post in every language so cross-links can be resolved.
  const all = {};
  for (const lang of LANGS) {
    const q = lang === 'en' ? '' : `&lang=${lang}`;
    all[lang] = await fetchJson(`${ORIGIN}/wp-json/wp/v2/posts?per_page=100${q}&_fields=id,slug,link,date,modified,title,excerpt,content,featured_media,categories,tags`);
    console.log(`${lang}: ${all[lang].length} posts`);
  }
  const postMap = [];
  for (const lang of LANGS) for (const p of all[lang]) {
    const to = lang === 'en' ? `/blog/${p.slug}` : `/${lang}/blog/${p.slug}`;
    postMap.push({ from: new URL(p.link).pathname, to });
    if (lang !== 'en') { // pre-WPML addresses without the /ru/ prefix, some with a -ru suffix (same rule as scripts/lib/legacy.mjs)
      postMap.push({ from: `/${p.slug}/`, to, variant: true });
      postMap.push({ from: p.slug.endsWith('-ru') ? `/${p.slug.slice(0, -3)}/` : `/${p.slug}-ru/`, to, variant: true });
    }
  }
  const allRedirects = [...redirects, ...postMap.filter((r) => !r.variant), ...postMap.filter((r) => r.variant)];

  for (const lang of LANGS) {
    const dir = join('content', lang, 'posts');
    mkdirSync(dir, { recursive: true });
    for (const p of all[lang]) {
      const slug = p.slug;
      const imgDir = join(dir, 'images', slug);
      let html = p.content.rendered;
      // Internal links → new paths; unknown old addresses → the blog index of that language.
      html = html.replace(/href="([^"]+)"/g, (m, href) => {
        if (!/arenasoldout\.com/.test(href)) return m;
        const mapped = mapLegacyUrl(decode(href), allRedirects);
        return `href="${mapped ?? (lang === 'en' ? '/blog' : `/${lang}/blog`)}"`;
      });
      // Images → downloaded files next to the post.
      const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)];
      for (const m of imgs) {
        const name = await download(decode(m[1]), imgDir, slug);
        html = html.replace(m[1], name ? `./images/${slug}/${name}` : '');
      }
      html = html.replace(/\ssrcset="[^"]*"/g, '').replace(/\ssizes="[^"]*"/g, '');
      let md = td.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
      md = md.replace(/!\[\]\(\)\n?/g, '');
      const fm = await media(p.featured_media);
      let cover = null;
      if (fm?.source_url) cover = await download(fm.source_url, imgDir, slug);
      const description = plain(p.excerpt.rendered).replace(/\s*\[…\]$/, '').slice(0, 300) || plain(p.content.rendered).slice(0, 200);
      const front = [
        '---',
        `title: ${yamlStr(plain(p.title.rendered))}`,
        `description: ${yamlStr(description)}`,
        `date: ${p.date.slice(0, 10)}`,
        p.modified && p.modified.slice(0, 10) !== p.date.slice(0, 10) ? `updated: ${p.modified.slice(0, 10)}` : null,
        cover ? `cover: ./images/${slug}/${cover}` : null,
        cover && fm?.alt_text ? `cover_alt: ${yamlStr(fm.alt_text)}` : null,
        `legacy_url: ${yamlStr(p.link)}`,
        'archive: true',
        '---',
      ].filter(Boolean).join('\n');
      writeFileSync(join(dir, `${slug}.md`), `${front}\n\n${md}\n`);
      console.log(`  ${lang}/${slug} (${imgs.length} images${cover ? ' + cover' : ''})`);
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
