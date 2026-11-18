// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { languages, defaultLanguage, siteUrl } from './site.config.ts';

/**
 * Last commit date of every file under content/, for <lastmod> in the sitemap. One `git log` pass; the
 * first time a file appears is its latest change. A shallow clone would date every file with the one
 * commit it has, which is worse than no date, so lastmod is left out there (CI checks out full history).
 */
function contentDates() {
  const dates = new Map();
  try {
    if (execSync('git rev-parse --is-shallow-repository', { encoding: 'utf8' }).trim() !== 'false') return dates;
    const log = execSync('git log --format=@%cI --name-only -- content', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let date = '';
    for (const line of log.split(/\r?\n/)) {
      if (line.startsWith('@')) date = line.slice(1);
      else if (line && !dates.has(line)) dates.set(line, date);
    }
  } catch {
    // No git (a plain copy of the folder): the sitemap simply has no lastmod.
  }
  return dates;
}
const dates = contentDates();
const codes = languages.map((l) => l.code);

/** The content file a sitemap URL is built from: a page YAML or a blog post. Undefined when unknown. */
function lastmodFor(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const lang = codes.includes(parts[0]) ? parts.shift() : defaultLanguage;
  const candidates = parts[0] === 'blog' && parts.length === 2
    ? [`content/${lang}/posts/${parts[1]}.md`, `content/${lang}/posts/${parts[1]}.mdx`]
    : [`content/${lang}/pages/${parts.length ? parts.join('/') : 'home'}.yaml`];
  const hit = candidates.find((f) => dates.has(f));
  return hit ? dates.get(hit) : undefined;
}

/**
 * True when the built page says noindex in its robots meta. The sitemap is written after the pages
 * (astro:build:done), so the page decides and the sitemap follows: a page out of search is never listed.
 */
function builtNoindex(page) {
  const path = new URL(page).pathname.replace(/\/$/, '');
  try {
    return /<meta name="robots" content="[^"]*noindex/.test(readFileSync(`dist${path || '/index'}.html`, 'utf8'));
  } catch {
    return false;
  }
}

// Static only (doc 33 §3.7a): `dist/` is plain files; Workers Static Assets and nginx serve the
// same folder. No adapter, no server rendering per request.
export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  i18n: {
    defaultLocale: defaultLanguage,
    locales: languages.map((l) => l.code),
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    svelte(),
    sitemap({
      // Pages of languages not in the menu yet are noindex: keep them out. Blog posts stay, and so does the blog index of a language that has archive posts.
      filter: (page) => !/\/start\/(thanks|continue|confirm)|\/subscribe\/(confirm|unsubscribe)\/?$/.test(page) && !page.endsWith('/404')
        && !languages.some((l) => !l.inMenu && new RegExp(`^${siteUrl}/${l.code}(/(?!blog/).*)?/?$`).test(page)
          && !(new RegExp(`^${siteUrl}/${l.code}/blog/?$`).test(page) && existsSync(`content/${l.code}/posts`)))
        && !builtNoindex(page),
      // hreflang in the sitemap uses the same bare language codes as the <link rel="alternate"> tags in the
      // HTML (en, es, pt...). Regional codes (en-GB, pt-BR) here would contradict the pages and narrow English to the UK.
      i18n: {
        defaultLocale: defaultLanguage,
        locales: Object.fromEntries(languages.map((l) => [l.code, l.code])),
      },
      serialize(item) {
        const lastmod = lastmodFor(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
