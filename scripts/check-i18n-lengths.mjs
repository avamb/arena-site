/**
 * SEO lengths of translated pages: title at most 60 characters, description at most 160.
 * Usage: node scripts/check-i18n-lengths.mjs [lang ...]   (default: every language folder but en)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const langs = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync('content').filter((d) => d !== 'en' && d !== 'data' && statSync(join('content', d)).isDirectory());
let bad = 0;
for (const lang of langs) {
  for (const f of walk(join('content', lang, 'pages')).filter((f) => f.endsWith('.yaml'))) {
    const d = parse(readFileSync(f, 'utf8')) ?? {};
    if ((d.title ?? '').length > 60) { bad++; console.error(`lengths: ${f} title ${d.title.length} > 60: ${d.title}`); }
    if ((d.description ?? '').length > 160) { bad++; console.error(`lengths: ${f} description ${d.description.length} > 160`); }
  }
}
if (bad) process.exit(1);
console.log(`lengths: titles <= 60 and descriptions <= 160 in ${langs.join(', ')}`);
