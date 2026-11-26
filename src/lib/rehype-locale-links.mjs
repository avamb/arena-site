/**
 * Internal links inside blog posts point to the post's own language (owner, 19.11.2026: a Russian
 * article must lead only to Russian pages). Authors and translators write `[text](/pricing)`; a post in
 * content/<lang>/posts gets `/<lang>/pricing`. The default language, external links, anchors and links
 * already carrying a language prefix are left alone. Languages outside the menu have no translated
 * pages, so their links stay on the default-language pages. A link to a post that has no version in
 * this language keeps pointing at the original (old archive posts link English-only posts).
 */
import { existsSync } from 'node:fs';
import { visit } from 'unist-util-visit';
import { languages, defaultLanguage } from '../../site.config.ts';

const codes = languages.map((l) => l.code);
const inMenu = new Set(languages.filter((l) => l.inMenu).map((l) => l.code));

export function langOfFile(path) {
  const m = String(path ?? '').replace(/\\/g, '/').match(/\/content\/([a-z]{2})\/posts\//);
  return m ? m[1] : undefined;
}

export function localizeHref(href, lang) {
  if (!lang || lang === defaultLanguage || !inMenu.has(lang)) return href;
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const first = href.split(/[/?#]/)[1];
  if (codes.includes(first)) return href;
  const post = href.match(/^\/blog\/([^/?#]+)/);
  if (post && !['md', 'mdx'].some((x) => existsSync(`content/${lang}/posts/${post[1]}.${x}`))) return href;
  return href === '/' ? `/${lang}` : `/${lang}${href}`;
}

export default function rehypeLocaleLinks() {
  return (tree, file) => {
    const lang = langOfFile(file.path ?? file.history?.[0]);
    if (!lang) return;
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties?.href) node.properties.href = localizeHref(node.properties.href, lang);
    });
  };
}
