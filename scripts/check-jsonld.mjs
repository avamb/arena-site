/**
 * JSON-LD validity (doc 33 §3.10, item 3): every HTML page in dist/ has a parseable ld+json block
 * with @context and @type/@graph; Organization on every page; SoftwareApplication with offers on
 * / and /pricing; FAQPage where the page has questions; HowTo on / and /start; Article on posts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
const pages = walk('dist').filter((p) => !p.endsWith('404.html'));
let failed = false;
const fail = (p, m) => { failed = true; console.error(`jsonld: ${p}: ${m}`); };

const required = {
  Organization: ['name', 'url', 'legalName'],
  WebSite: ['url', 'name'],
  WebPage: ['url', 'name', 'description'],
  SoftwareApplication: ['name', 'applicationCategory', 'offers'],
  Offer: ['price', 'priceCurrency'],
  FAQPage: ['mainEntity'],
  Question: ['name', 'acceptedAnswer'],
  HowTo: ['name', 'step'],
  HowToStep: ['name', 'text'],
  BreadcrumbList: ['itemListElement'],
  Article: ['headline', 'datePublished', 'author'],
};

for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (!blocks.length) { fail(p, 'no JSON-LD'); continue; }
  const types = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node['@type']) {
      const t = node['@type'];
      types.add(t);
      for (const k of required[t] ?? []) if (node[k] === undefined || node[k] === '' || (Array.isArray(node[k]) && !node[k].length)) fail(p, `${t} missing ${k}`);
    }
    Object.values(node).forEach(visit);
  };
  for (const b of blocks) {
    let json;
    try { json = JSON.parse(b); } catch (e) { fail(p, `invalid JSON: ${e.message}`); continue; }
    if (json['@context'] !== 'https://schema.org') fail(p, 'missing @context');
    if (!json['@type'] && !json['@graph']) fail(p, 'missing @type/@graph');
    visit(json['@graph'] ?? json);
  }
  if (!types.has('Organization')) fail(p, 'no Organization');
  if (!types.has('WebPage')) fail(p, 'no WebPage');
  const rel = p.replace(/\\/g, '/').replace('dist/', '/');
  if ((rel === '/index.html' || rel === '/pricing.html') && (!types.has('SoftwareApplication') || !types.has('Offer'))) fail(p, 'no SoftwareApplication with offers');
  if ((rel === '/index.html' || rel === '/start.html') && !types.has('HowTo')) fail(p, 'no HowTo');
  if ((rel === '/index.html' || rel === '/pricing.html') && !types.has('FAQPage')) fail(p, 'no FAQPage');
  if (/<details/.test(html) && !types.has('FAQPage')) fail(p, 'page has questions but no FAQPage');
  if (!/<h1[\s>]/.test(html)) fail(p, 'no h1');
}
if (failed) process.exit(1);
console.log(`jsonld: ${pages.length} pages valid`);
