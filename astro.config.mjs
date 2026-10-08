// @ts-check
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
      filter: (page) => !page.includes('/start/thanks') && !page.endsWith('/404'),
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
