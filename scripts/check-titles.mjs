// Titles are plain text: no emoji (SEO-004) and no HTML entities, which Astro escapes into the visible title.
// Link text in post bodies must describe the target (SEO-007): no empty anchors, no bare "here".
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const emoji = /\p{Extended_Pictographic}/u;
const entity = /&#?\w+;/;
const bad = [];
for (const lang of readdirSync('content').filter((d) => d !== 'data')) {
  const dir = join('content', lang, 'posts');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const text = readFileSync(join(dir, f), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    if (/(^|[^!])\[\s*\]\(/m.test(body)) bad.push(`${join(dir, f)} body: empty link text`);
    if (/\[(here|click here|read more|тут|здесь|ссылка)\]\(/i.test(body)) bad.push(`${join(dir, f)} body: non-descriptive link text`);
    for (const key of ['title', 'description']) {
      const line = fm.split(/\r?\n/).find((l) => l.startsWith(`${key}:`)) ?? '';
      if (emoji.test(line) || entity.test(line)) bad.push(`${join(dir, f)} ${key}: ${line.slice(0, 80)}`);
    }
  }
}
if (bad.length) {
  console.error(`titles: emoji or HTML entity in frontmatter, or bad link text in body:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('titles: no emoji or entities in titles, no empty or generic link text in posts');
