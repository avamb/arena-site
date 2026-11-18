// hreflang comes only from src/lib/translations.ts: every post in a group must exist, a group needs at
// least two languages, and no post may appear in two groups (an alternate must be exactly one page per language).
import { readFileSync, existsSync } from 'node:fs';

const src = readFileSync('src/lib/translations.ts', 'utf8');
const config = readFileSync('site.config.ts', 'utf8');
const langs = [...config.matchAll(/code:\s*'(\w+)'/g)].map((m) => m[1]);
const groups = [...src.matchAll(/^\s*\{([^{}]*)\},?$/gm)].map((m) => [...m[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((x) => [x[1], x[2]]));
const errors = [];
const seen = new Map();
for (const group of groups) {
  if (group.length < 2) errors.push(`group with one language: ${JSON.stringify(group)}`);
  const inGroup = new Set();
  for (const [lang, slug] of group) {
    if (!langs.includes(lang)) errors.push(`unknown language ${lang} (${slug})`);
    if (inGroup.has(lang)) errors.push(`language twice in one group: ${lang}`);
    inGroup.add(lang);
    if (!existsSync(`content/${lang}/posts/${slug}.md`)) errors.push(`missing ${lang} post: ${slug}`);
    const k = `${lang}:${slug}`;
    if (seen.has(k)) errors.push(`listed twice: ${k}`);
    seen.set(k, true);
  }
}
if (groups.length === 0) errors.push('no post groups parsed');
if (errors.length) {
  console.error(`hreflang:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`hreflang: ${groups.length} post groups valid`);
