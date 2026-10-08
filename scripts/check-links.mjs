/**
 * Internal link check: every href/src that starts with "/" in the built HTML must resolve to a built
 * file, a redirect from redirects.yaml / post legacy_url, or an anchor on an existing page.
 * Also verifies that every legacy_url of an imported post has a redirect target that exists.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { allRedirects } from './lib/legacy.mjs';

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
const pages = walk('dist');
const redirects = allRedirects();
const exists = (path) => {
  const clean = path.replace(/[?#].*$/, '');
  if (clean === '/' || clean === '') return true;
  const p = join('dist', clean.replace(/\/$/, ''));
  return existsSync(p) || existsSync(p + '.html') || existsSync(join(p, 'index.html'));
};
const redirected = (path) => redirects.some((r) => {
  const from = r.from.replace(/\/$/, '');
  const clean = path.replace(/[?#].*$/, '').replace(/\/$/, '');
  return r.from.endsWith('*') ? clean.startsWith(r.from.slice(0, -1)) : clean === from;
});

let failed = 0;
const seen = new Map();
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const [pathPart, anchor] = href.split('#');
    if (pathPart === '' || pathPart === file.replace(/\\/g, '/').replace('dist', '').replace(/\.html$/, '')) {
      if (anchor && !ids.has(anchor)) { failed++; console.error(`links: ${file}: anchor #${anchor} not on this page`); }
      continue;
    }
    if (exists(pathPart)) continue;
    if (redirected(pathPart)) { failed++; console.error(`links: ${file}: ${href} points at a redirect, link the final address`); continue; }
    const key = href;
    if (!seen.has(key)) { seen.set(key, file); failed++; console.error(`links: ${file}: ${href} does not exist`); }
  }
}
// A redirect must never shadow a page that exists in this build (Cloudflare evaluates _redirects before assets).
for (const file of pages) {
  const route = '/' + file.replace(/\/g, '/').replace(/^dist//, '').replace(/.html$/, '').replace(/(^|/)index$/, '');
  const r = redirects.find((r) => (r.from.endsWith('*') ? route.startsWith(r.from.slice(0, -1)) : route === r.from.replace(//$/, '')));
  if (r) { failed++; console.error(`links: redirect ${r.from} → ${r.to} shadows the existing page ${route}`); }
}
for (const r of redirects) {
  const target = r.to.replace(/#.*$/, '');
  if (!exists(target) && !redirected(target)) { failed++; console.error(`links: redirect ${r.from} → ${r.to}: target does not exist`); }
}
if (failed) { console.error(`links: ${failed} problem(s)`); process.exit(1); }
console.log(`links: ${pages.length} pages, every internal link resolves; ${redirects.length} redirects point at existing pages`);
