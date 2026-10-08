/**
 * Legacy URL map shared by the WordPress import and the edge build.
 * - Page redirects live in redirects.yaml (single source of truth, doc 33 §3.7a).
 * - Post redirects are derived from `legacy_url` in every post's frontmatter, so an imported
 *   article can never lose its old address.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const OLD_ORIGIN = 'https://arenasoldout.com';

export function pageRedirects() {
  return parse(readFileSync('redirects.yaml', 'utf8')).redirects;
}

/** [{ from: '/old-slug/', to: '/blog/old-slug', code: 301 }] from content/<lang>/posts/*.md */
export function postRedirects() {
  const out = [];
  if (!existsSync('content')) return out;
  for (const lang of readdirSync('content').filter((d) => d !== 'data')) {
    const dir = join('content', lang, 'posts');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))) {
      const text = readFileSync(join(dir, file), 'utf8');
      const m = text.match(/^---\n([\s\S]*?)\n---/);
      if (!m) continue;
      const fm = parse(m[1]);
      if (!fm.legacy_url || fm.draft) continue;
      const slug = file.replace(/\.mdx?$/, '');
      const from = fm.legacy_url.replace(OLD_ORIGIN, '');
      const to = lang === 'en' ? `/blog/${slug}` : `/${lang}/blog/${slug}`;
      if (from !== to && from !== `${to}/`) out.push({ from, to, code: 301 });
      // Pre-WPML addresses: Russian posts once lived without the /ru/ prefix, some with a -ru suffix.
      if (lang !== 'en') {
        const bare = `/${slug}/`;
        if (bare !== from) out.push({ from: bare, to, code: 301, legacy_variant: true });
        if (slug.endsWith('-ru')) out.push({ from: `/${slug.slice(0, -3)}/`, to, code: 301, legacy_variant: true });
        else out.push({ from: `/${slug}-ru/`, to, code: 301, legacy_variant: true });
      }
    }
  }
  return out;
}

export function allRedirects() {
  const seen = new Set();
  const out = [];
  for (const r of [...pageRedirects(), ...postRedirects().filter((r) => !r.legacy_variant), ...postRedirects().filter((r) => r.legacy_variant)]) {
    const key = r.from.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from: r.from, to: r.to, code: r.code ?? 301 });
  }
  return out;
}

/** Map an absolute or relative old URL to the new path; returns null when unknown. */
export function mapLegacyUrl(url, redirects = allRedirects()) {
  let path;
  try { const u = new URL(url, OLD_ORIGIN); if (u.origin !== OLD_ORIGIN && u.origin !== 'https://www.arenasoldout.com') return null; path = u.pathname + (u.hash || ''); } catch { return null; }
  const hash = path.includes('#') ? path.slice(path.indexOf('#')) : '';
  const clean = path.replace(/#.*$/, '');
  const variants = [clean, clean.endsWith('/') ? clean.slice(0, -1) : clean + '/'];
  for (const r of redirects) {
    const from = r.from.replace(/\*$/, '');
    if (variants.includes(r.from) || (r.from.endsWith('*') && clean.startsWith(from))) return r.to + (r.to.includes('#') ? '' : hash);
  }
  if (clean === '/') return '/';
  return null;
}
