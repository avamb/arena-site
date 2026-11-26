// New blog articles (not `archive: true`, not `draft: true`) follow the article template (18.11.2026):
// an author from content/data/authors.yaml, title at most 60 characters, description 70-160, a cover with alt text, at least two internal links,
// a FAQ section under the language's `post.faq` heading with "### question" items, and no prices in the
// text (prices live in content/data and on /pricing; link there instead).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from 'yaml';

const en = JSON.parse(readFileSync('i18n/en.json', 'utf8'));
const authors = Object.keys(parse(readFileSync('content/data/authors.yaml', 'utf8')) ?? {});
const bad = [];
let checked = 0;
for (const lang of readdirSync('content').filter((d) => d !== 'data')) {
  const dir = join('content', lang, 'posts');
  if (!existsSync(dir)) continue;
  const dict = existsSync(`i18n/${lang}.json`) ? JSON.parse(readFileSync(`i18n/${lang}.json`, 'utf8')) : {};
  const faqHeading = dict['post.faq'] ?? en['post.faq'];
  for (const f of readdirSync(dir).filter((n) => /\.mdx?$/.test(n))) {
    const file = join(dir, f);
    const text = readFileSync(file, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) { bad.push(`${file}: no frontmatter`); continue; }
    const fm = parse(m[1]) ?? {};
    if (fm.archive || fm.draft) continue;
    checked++;
    const body = m[2];
    const len = (s) => [...String(s ?? '')].length;
    if (len(fm.title) === 0 || len(fm.title) > 60) bad.push(`${file}: title is ${len(fm.title)} characters (1-60)`);
    if (len(fm.description) < 70 || len(fm.description) > 160) bad.push(`${file}: description is ${len(fm.description)} characters (70-160)`);
    if (!authors.includes(fm.author)) bad.push(`${file}: author must be an id from content/data/authors.yaml (${authors.join(', ')}), got ${fm.author ?? 'none'}`);
    if (!fm.cover) bad.push(`${file}: no cover`);
    else if (!existsSync(join(dirname(file), fm.cover))) bad.push(`${file}: cover file not found: ${fm.cover}`);
    if (!String(fm.cover_alt ?? '').trim()) bad.push(`${file}: no cover_alt`);
    const internal = [...body.matchAll(/\]\((\/[^)\s]*)\)/g)].length;
    if (internal < 2) bad.push(`${file}: ${internal} internal link(s), at least 2 (pricing, product, solutions, start)`);
    const lines = body.split(/\r?\n/);
    const start = lines.findIndex((l) => l.replace(/^##\s+/, '').trim() === faqHeading && /^##\s/.test(l));
    if (start < 0) bad.push(`${file}: no FAQ section "## ${faqHeading}"`);
    else {
      const rest = lines.slice(start + 1);
      const end = rest.findIndex((l) => /^##\s/.test(l));
      if (!(end < 0 ? rest : rest.slice(0, end)).some((l) => /^###\s+\S/.test(l))) bad.push(`${file}: FAQ section has no "### question"`);
    }
    lines.forEach((l, i) => {
      if (/(US\$|\$\s?\d|€\s?\d|\d\s?€|\bUSD\b|\bEUR\b)/.test(l)) bad.push(`${file}:${i + m[1].split('\n').length + 3}: price in the text, link /pricing instead: ${l.trim().slice(0, 80)}`);
    });
  }
}
if (bad.length) {
  console.error(`posts: ${bad.length} problem(s) in new articles:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log(`posts: ${checked} new article(s) follow the template (archive and drafts skipped)`);
