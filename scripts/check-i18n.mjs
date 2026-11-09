/**
 * Translation parity (doc 33 §3.6, item 4): every translated file has the same set of keys (YAML
 * structure / frontmatter) and the same {placeholders} as the `en` original; reports which pages
 * are not translated into which language. Languages come from site.config.ts.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { parse } from 'yaml';

const config = readFileSync('site.config.ts', 'utf8');
const langs = [...config.matchAll(/code:\s*'(\w+)'/g)].map((m) => m[1]);
const active = [...config.matchAll(/code:\s*'(\w+)'[^}]*inMenu:\s*true/g)].map((m) => m[1]);
const def = 'en';

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const keysOf = (obj, prefix = '') => Object.entries(obj ?? {}).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keysOf(v, `${prefix}${k}.`) : Array.isArray(v) ? [`${prefix}${k}[${v.length}]`] : [`${prefix}${k}`]));
// YAML comments are not content: placeholders mentioned there do not count.
const placeholders = (text) => [...text.replace(/^\s*#.*$/gm, '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const frontmatter = (text) => { const m = text.match(/^---\n([\s\S]*?)\n---/); return m ? parse(m[1]) : {}; };

const originals = walk(`content/${def}`).filter((f) => /.(ya?ml|mdx?)$/.test(f)); // text files only, images sit next to posts
let failed = false;
const report = {};
for (const lang of langs.filter((l) => l !== def)) {
  report[lang] = { translated: 0, missing: [] };
  for (const file of originals) {
    const rel = relative(`content/${def}`, file);
    const twin = join('content', lang, rel);
    if (!existsSync(twin)) { report[lang].missing.push(rel); continue; }
    report[lang].translated++;
    const a = readFileSync(file, 'utf8'), b = readFileSync(twin, 'utf8');
    const ext = extname(file);
    const [ka, kb] = ext === '.md' || ext === '.mdx' ? [keysOf(frontmatter(a)), keysOf(frontmatter(b))] : [keysOf(parse(a)), keysOf(parse(b))];
    const missingKeys = ka.filter((k) => !kb.includes(k)), extraKeys = kb.filter((k) => !ka.includes(k));
    if (missingKeys.length || extraKeys.length) { failed = true; console.error(`i18n: ${twin} keys differ from ${file}: missing [${missingKeys}] extra [${extraKeys}]`); }
    if (placeholders(a) !== placeholders(b)) { failed = true; console.error(`i18n: ${twin} placeholders differ: ${placeholders(a)} vs ${placeholders(b)}`); }
  }
}
for (const lang of langs) {
  const files = walk(`i18n`).filter((f) => f.endsWith(`${lang}.json`));
  if (lang !== def && files.length) {
    const a = keysOf(JSON.parse(readFileSync(`i18n/${def}.json`, 'utf8'))), b = keysOf(JSON.parse(readFileSync(files[0], 'utf8')));
    const extra = b.filter((k) => !a.includes(k));
    if (extra.length) { failed = true; console.error(`i18n: i18n/${lang}.json has keys not in en.json: ${extra}`); }
  }
}
for (const [lang, r] of Object.entries(report)) {
  const list = r.missing.length <= 12 ? r.missing.join(', ') : `${r.missing.slice(0, 12).join(', ')} … (+${r.missing.length - 12})`;
  console.log(`i18n: ${lang}${active.includes(lang) ? '' : ' (not in menu)'}: ${r.translated} translated, ${r.missing.length} not translated${r.missing.length ? ': ' + list : ''}`);
}
if (failed) process.exit(1);
console.log(`i18n: parity ok for ${originals.length} original files`);
