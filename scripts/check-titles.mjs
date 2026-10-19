// Titles are plain text: no emoji (SEO-004) and no HTML entities, which Astro escapes into the visible title.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const emoji = /\p{Extended_Pictographic}/u;
const entity = /&#?\w+;/;
const bad = [];
for (const lang of readdirSync('content').filter((d) => d !== 'data')) {
  const dir = join('content', lang, 'posts');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const fm = readFileSync(join(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    for (const key of ['title', 'description']) {
      const line = fm.split(/\r?\n/).find((l) => l.startsWith(`${key}:`)) ?? '';
      if (emoji.test(line) || entity.test(line)) bad.push(`${join(dir, f)} ${key}: ${line.slice(0, 80)}`);
    }
  }
}
if (bad.length) {
  console.error(`titles: emoji or HTML entity in frontmatter:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('titles: no emoji or entities in post titles/descriptions');
