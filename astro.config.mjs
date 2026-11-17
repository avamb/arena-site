// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { languages, defaultLanguage, siteUrl } from './site.config.ts';

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
          && !(new RegExp(`^${siteUrl}/${l.code}/blog/?$`).test(page) && existsSync(`content/${l.code}/posts`))),
      i18n: {
        defaultLocale: defaultLanguage,
        locales: Object.fromEntries(languages.map((l) => [l.code, l.intl])),
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
