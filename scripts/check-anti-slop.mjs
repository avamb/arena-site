/**
 * Anti-slop grep (DESIGN.md prohibitions, design/anti-slop-skill/references/catalog.md, UX-DECISIONS
 * forbidden promises, doc 33 §3.9 provider rule). Deterministic checks only; the visual pass is manual.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const walk = (dir, exts) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === 'node_modules' || f.startsWith('.')) return [];
  return statSync(p).isDirectory() ? walk(p, exts) : exts.includes(extname(f)) ? [p] : [];
});

// Archive posts and legal texts are transferred as they were (owner decision); copy rules apply to the site's own texts only.
const isArchive = (f) => /[\\/]posts[\\/]|[\\/]pages[\\/]legal[\\/]/.test(f);
const content = [...walk('content', ['.yaml', '.yml', '.md', '.mdx']).filter((f) => !isArchive(f)), ...walk('i18n', ['.json'])];
const code = [...walk('src', ['.astro', '.svelte', '.css', '.ts'])];
const findings = [];
const flag = (file, line, rule, text) => findings.push({ file, line, rule, text: text.trim().slice(0, 100) });

const scan = (files, rules, exempt = {}) => {
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (l.trimStart().startsWith('#') && file.startsWith('content')) return; // YAML comments
      for (const [rule, re] of rules) if (re.test(l) && !(exempt[rule] ?? []).some((e) => file.split('\\').join('/').endsWith(e))) flag(file, i + 1, rule, l);
    });
  }
};

/* Copy (T21 and UX-DECISIONS) */
scan(content, [
  ['T21 buzzword', /\b(Elevate|Unlock|Supercharge|Seamless|Seamlessly|Empower|Streamline|Leverage|Effortless|Cutting-edge|Revolutioni[sz]e|Game-changing|Next-level)\b/i],
  ['T21 generic CTA', /\b(Get started|Learn more|Discover more|Sign up now)\b/i],
  ['Forbidden promise', /\b(waitlist|wait list|access code|Apple Wallet|Google Wallet|tax invoice|mobile app for buyers|buyer account|best available seats|no card needed|self-service signup|#1|world's most loved|73,000)\b/i],
  ['Word rule: hall', /\bhalls?\b(?! of)/i],
  ['Word rule: bare "tours"', /(?<!concert )(?<!concert-)(?<!For )\btours\b/i],
  ['Word rule: our fee', /\bour fee\b/i],
  ['Em-dash', /—/],
  ['Exclamation mark', /!(?!=)(?!\[)/],
  ['Providers in prose (§3.9)', /Stripe or Flitt|Stripe и Flitt|your Stripe or Flitt/],
], { 'Forbidden promise': ['content/data/facts.yaml'] /* the explicit "we do not offer" table */ });

/* Code (catalog bans and system rules) */
scan(code.filter((f) => !f.endsWith('tokens.css')), [
  ['T6 indigo/violet hex', /#(6366f1|4f46e5|4338ca|3730a3|8b5cf6|7c3aed|a855f7|818cf8|7f5af0)\b/i],
  ['T6 gradient text', /bg-clip-text|background-clip:\s*text/],
  ['T19 transition: all', /transition(-all|\s*:\s*all)/],
  ['T23 pulsing dot', /animate-(ping|pulse)|animation:[^;]*\b(ping|pulse)\b/],
  ['T1 coloured left border on card', /border-l-4|border-left:\s*\d+px\s+solid\s+(?!var\(--line)/],
  ['T2 emoji in UI', /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u],
  ['T14 default font', /font-family:[^;]*\b(Inter|Roboto|Poppins|Open Sans|Lato|Geist)\b/],
  ['T24 underline on action', /\.btn[^{]*\{[^}]*text-decoration:\s*underline/],
]);

/* Literal colours outside tokens.css (hex, rgb) — components must use tokens */
for (const file of code.filter((f) => !f.endsWith('tokens.css') && !f.endsWith('Base.astro'))) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b(?![0-9a-f])|rgba?\(/i.test(l) && !/url\(|data:image|svg|@import|fill="#000"/.test(l)) flag(file, i + 1, 'Literal colour outside tokens', l);
  });
}

/* T3: uppercase only in .eyebrow */
for (const file of code.filter((f) => f.endsWith('.css'))) {
  const text = readFileSync(file, 'utf8');
  const upper = [...text.matchAll(/([^{}]+)\{[^}]*text-transform:\s*uppercase[^}]*\}/g)].map((m) => m[1].trim());
  for (const sel of upper) if (!sel.includes('.eyebrow')) flag(file, 0, 'T3 uppercase outside .eyebrow', sel);
}

/* YAML flow mappings: an unquoted text with a comma silently becomes extra keys ("One show, many cities") */
import('yaml').then(({ parse }) => {
  const visit = (o, f, trail) => {
    if (Array.isArray(o)) o.forEach((x, i) => visit(x, f, `${trail}[${i}]`));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (/\s/.test(k) || v === null) flag(f, 0, 'YAML text broken by a comma (quote it)', `${trail} ${k}`); visit(v, f, `${trail}.${k}`); }
  };
  for (const f of walk('content', ['.yaml', '.yml'])) { try { visit(parse(readFileSync(f, 'utf8')), f, ''); } catch (e) { flag(f, 0, 'YAML parse error', e.message); } }
  report();
});

function report() {
/* T9 accent budget: count var(--accent) in the home sections (rough proxy, informational) */
if (findings.length) {
  console.error(`anti-slop: ${findings.length} finding(s)`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.text}`);
  process.exit(1);
}
console.log(`anti-slop: clean (${content.length} content files, ${code.length} code files)`);
}
