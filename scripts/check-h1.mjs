// The post template renders the title as the page H1, so a body-level "# " heading makes a second H1.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const bad = [];
for (const lang of readdirSync('content')) {
  const dir = join('content', lang, 'posts');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const body = readFileSync(join(dir, f), 'utf8').replace(/^---[\s\S]*?\r?\n---/, '');
    if (/^# /m.test(body)) bad.push(join(dir, f));
  }
}
if (bad.length) {
  console.error(`h1: ${bad.length} post(s) have a body-level "# " heading (second H1):\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('h1: no body-level H1 in posts');
