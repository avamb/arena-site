/**
 * redirects.yaml + headers.yaml → dist/_redirects, dist/_headers (Cloudflare Workers Static Assets)
 * and ops/nginx/redirects.conf, ops/nginx/headers.conf (nginx). With --check it only verifies that
 * every entry of both YAML files is present in all four outputs (parity test, doc 33 §3.7a).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parse } from 'yaml';

const check = process.argv.includes('--check');
const indexing = process.env.SITE_INDEXING === 'true';
const redirects = parse(readFileSync('redirects.yaml', 'utf8')).redirects;
const headers = parse(readFileSync('headers.yaml', 'utf8')).headers;
if (!indexing) headers[0].values['X-Robots-Tag'] = 'noindex, nofollow';

const variants = (p) => (p.endsWith('/') && p !== '/' ? [p, p.slice(0, -1)] : p.includes('.') ? [p] : [p, p + '/']);

/* Cloudflare */
const cfRedirects = redirects.flatMap((r) => variants(r.from).map((f) => `${f} ${r.to} ${r.code ?? 301}`)).join('\n') + '\n';
const cfHeaders = headers.map((h) => [h.pattern, ...Object.entries(h.values).map(([k, v]) => `  ${k}: ${v}`)].join('\n')).join('\n\n') + '\n';

/* nginx */
const esc = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const ngxRedirects = redirects
  .map((r) => `location = ${r.from.endsWith('/') && r.from !== '/' ? r.from.slice(0, -1) : r.from} { return ${r.code ?? 301} ${r.to}; }` + (r.from.endsWith('/') && r.from !== '/' ? `\nlocation = ${r.from} { return ${r.code ?? 301} ${r.to}; }` : r.from.includes('.') ? '' : `\nlocation = ${r.from}/ { return ${r.code ?? 301} ${r.to}; }`))
  .join('\n') + '\n';
const toNginx = (h) => {
  const lines = Object.entries(h.values)
    .filter(([k]) => k.toLowerCase() !== 'content-type')
    .map(([k, v]) => `    add_header ${k} "${String(v).replace(/"/g, '\\"')}" always;`);
  const type = Object.entries(h.values).find(([k]) => k.toLowerCase() === 'content-type');
  if (type) lines.push(`    types { } default_type "${type[1]}";`);
  if (h.pattern === '/*') return `# global (/*)\n${lines.join('\n')}\n`;
  const p = h.pattern;
  if (p.startsWith('/*.')) return `location ~* \\.${esc(p.slice(3))}$ {\n${lines.join('\n')}\n    try_files $uri =404;\n}\n`;
  if (p.endsWith('/*')) return `location ^~ ${p.slice(0, -1)} {\n${lines.join('\n')}\n    try_files $uri =404;\n}\n`;
  return `location = ${p} {\n${lines.join('\n')}\n    try_files $uri =404;\n}\n`;
};
// nginx: add_header in a location replaces the parent's headers, so repeat the global ones inside each location.
const globalLines = Object.entries(headers[0].values).map(([k, v]) => `    add_header ${k} "${String(v).replace(/"/g, '\\"')}" always;`);
const ngxHeaders = headers
  .map((h) => (h.pattern === '/*' ? toNginx(h) : toNginx(h).replace('{\n', '{\n' + globalLines.join('\n') + '\n')))
  .join('\n');

const outputs = {
  'dist/_redirects': cfRedirects,
  'dist/_headers': cfHeaders,
  'ops/nginx/redirects.conf': ngxRedirects,
  'ops/nginx/headers.conf': ngxHeaders,
};

if (check) {
  let failed = false;
  for (const [file, expected] of Object.entries(outputs)) {
    if (!existsSync(file)) { console.error(`edge: missing ${file} (run the build first)`); failed = true; continue; }
    const actual = readFileSync(file, 'utf8');
    if (actual !== expected) { console.error(`edge: ${file} differs from redirects.yaml/headers.yaml`); failed = true; }
  }
  for (const r of redirects) {
    for (const [file, text] of Object.entries(outputs)) {
      if (file.includes('redirects') && !text.includes(r.to)) { console.error(`edge: ${r.from} → ${r.to} missing in ${file}`); failed = true; }
    }
  }
  for (const h of headers) for (const k of Object.keys(h.values)) {
    if (!cfHeaders.includes(k) || (!ngxHeaders.includes(k) && k.toLowerCase() !== 'content-type')) { console.error(`edge: header ${k} missing`); failed = true; }
  }
  if (failed) process.exit(1);
  console.log(`edge: ${redirects.length} redirects and ${headers.length} header groups present in Cloudflare and nginx outputs`);
} else {
  mkdirSync('ops/nginx', { recursive: true });
  for (const [file, text] of Object.entries(outputs)) writeFileSync(file, text);
  console.log(`edge: wrote ${Object.keys(outputs).join(', ')} (indexing=${indexing})`);
}
