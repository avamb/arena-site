/**
 * Agent standard (doc 33 §3.10): llms.txt and llms-full.txt exist; every page in the sitemap has a
 * Markdown twin; facts.json parses and carries pricing/providers/markets; robots.txt lists the
 * allowed agents; when indexing is off every page is noindex and robots disallows all;
 * the first 60 words of every page contain no banned adjectives (T21).
 */
import { readFileSync, existsSync } from 'node:fs';

let failed = false;
const fail = (m) => { failed = true; console.error(`agents: ${m}`); };
const indexing = process.env.SITE_INDEXING === 'true';

for (const f of ['dist/llms.txt', 'dist/llms-full.txt', 'dist/facts.json', 'dist/robots.txt', 'dist/sitemap-index.xml', 'dist/_headers', 'dist/_redirects']) if (!existsSync(f)) fail(`missing ${f}`);

const sitemap = existsSync('dist/sitemap-0.xml') ? readFileSync('dist/sitemap-0.xml', 'utf8') : '';
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!urls.length) fail('sitemap has no URLs');
for (const u of urls) {
  const html = u === '/' ? 'dist/index.html' : `dist${u.replace(/\/$/, '')}.html`;
  const md = u === '/' ? 'dist/index.md' : `dist${u.replace(/\/$/, '')}.md`;
  if (!existsSync(html)) fail(`sitemap URL without page: ${u}`);
  if (!existsSync(md)) fail(`no Markdown twin for ${u} (${md})`);
  if (existsSync(html)) {
    const text = readFileSync(html, 'utf8');
    if (!/<link rel="alternate" type="text\/markdown"/.test(text)) fail(`${u}: no link to the Markdown twin`);
    const robots = text.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? '';
    if (!indexing && !robots.includes('noindex')) fail(`${u}: indexing is off but page is not noindex`);
    if (indexing && robots.includes('noindex') && !u.includes('thanks')) fail(`${u}: indexing is on but page is noindex`);
    const main = text.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
    const words = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 60).join(' ');
    if (/\b(Elevate|Unlock|Supercharge|Seamless|Empower|Streamline|Leverage|best-in-class|world-class)\b/i.test(words)) fail(`${u}: first 60 words contain a marketing adjective`);
  }
}

const facts = JSON.parse(readFileSync('dist/facts.json', 'utf8'));
for (const k of ['capabilities', 'pricing', 'providers', 'markets', 'languages', 'limits']) if (!facts[k]) fail(`facts.json missing ${k}`);
if (!facts.pricing?.regions?.length) fail('facts.json has no pricing regions');

const robots = readFileSync('dist/robots.txt', 'utf8');
for (const ua of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot']) if (!robots.includes(ua)) fail(`robots.txt does not mention ${ua}`);
if (!indexing && !/User-agent: \*\s*\nDisallow: \//.test(robots)) fail('indexing off but robots.txt does not disallow all');
if (indexing && !/Sitemap:/.test(robots)) fail('indexing on but robots.txt has no Sitemap line');

const llms = readFileSync('dist/llms.txt', 'utf8');
if (!/^# /.test(llms) || !/^> /m.test(llms)) fail('llms.txt does not follow the h1 + blockquote format');
const headers = readFileSync('dist/_headers', 'utf8');
if (!/\/\*\.md[\s\S]*text\/markdown/.test(headers)) fail('_headers does not set text/markdown for .md');
if (!indexing && !/X-Robots-Tag: noindex/.test(headers)) fail('indexing off but _headers has no X-Robots-Tag');

if (failed) process.exit(1);
console.log(`agents: ${urls.length} pages with Markdown twins, llms.txt, facts.json and robots.txt ok (indexing=${indexing})`);
