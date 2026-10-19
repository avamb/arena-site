// hreflang comes only from src/lib/translations.ts: every listed page must exist, and no page may
// appear in two pairs (an alternate must be exactly one page per language).
import { readFileSync, existsSync } from 'node:fs';

const src = readFileSync('src/lib/translations.ts', 'utf8');
const posts = [...src.matchAll(/^\s*\['([^']+)', '([^']+)'\],?$/gm)].map((m) => [m[1], m[2]]);
const errors = [];
const seen = new Map();
for (const [en, ru] of posts) {
  if (!existsSync(`content/en/posts/${en}.md`)) errors.push(`missing en post: ${en}`);
  if (!existsSync(`content/ru/posts/${ru}.md`)) errors.push(`missing ru post: ${ru}`);
  for (const k of [`en:${en}`, `ru:${ru}`]) {
    if (seen.has(k)) errors.push(`listed twice: ${k}`);
    seen.set(k, true);
  }
}
if (posts.length === 0) errors.push('no post pairs parsed');
if (errors.length) {
  console.error(`hreflang:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`hreflang: ${posts.length} post pairs valid`);
