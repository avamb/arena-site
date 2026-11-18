/**
 * Everything a route needs for one page in one language: content with fallback, data
 * collections, Markdown twin, JSON-LD inputs. Used by the HTML routes, the `.md` twins,
 * `llms.txt` and `llms-full.txt`, so they can never disagree.
 */
import { defaultLanguage, languages, type LanguageCode } from '@config';
import { getCollection } from 'astro:content';
import { getPage, getProviders, getMarkets, getPricing, getChangelog, getPosts, pageSlugs, slugToPath, navFor } from './data';
import { pageToMarkdown, type PageData } from './markdown';
import { localePath, t } from './i18n';
import type { JsonLdInput } from './jsonld';
import { plain } from './inline';

export type LoadedPage = PageData & { translated: boolean; markdown: string; jsonld: JsonLdInput };

const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Breadcrumb names come from the parent pages' own h1 when the parent page exists. */
async function breadcrumbsFor(lang: LanguageCode, slug: string, name: string) {
  const parts = slug.split('/');
  const all = await getCollection('pages');
  const crumbs = [{ name: t(lang, 'crumbs.home'), path: localePath(lang, '/') }];
  for (let i = 0; i < parts.length; i++) {
    const partial = parts.slice(0, i + 1).join('/');
    const path = localePath(lang, '/' + partial);
    if (i === parts.length - 1) { crumbs.push({ name, path }); break; }
    const parent = all.find((p) => p.id === `${lang}/pages/${partial}`) ?? all.find((p) => p.id === `${defaultLanguage}/pages/${partial}`);
    crumbs.push({ name: parent ? plain(parent.data.h1 ?? parent.data.title) : titleCase(parts[i]), path: parent ? path : localePath(lang, '/') });
  }
  return crumbs;
}

/** Every (language, slug) route to build: all pages for menu languages, own files only for the rest. */
export async function pageRoutes(): Promise<{ lang: LanguageCode; slug: string }[]> {
  const slugs = await pageSlugs();
  const all = await getCollection('pages');
  const out: { lang: LanguageCode; slug: string }[] = [];
  for (const l of languages) {
    for (const slug of slugs) {
      if (l.inMenu || all.some((p) => p.id === `${l.code}/pages/${slug}`)) out.push({ lang: l.code, slug });
    }
  }
  return out;
}

export async function loadPage(lang: LanguageCode, slug: string): Promise<LoadedPage> {
  const { page, translated } = await getPage(lang, slug);
  const [providers, markets, pricing, changelog, posts] = await Promise.all([getProviders(), getMarkets(), getPricing(), getChangelog(), getPosts(lang)]);
  const path = localePath(lang, slugToPath(slug));
  const data: PageData = { lang, path, page, providers, markets, pricing, changelog, posts };
  const markdown = pageToMarkdown(data, navFor(lang));

  const faq = page.data.sections.flatMap((s) => (s.type === 'qa' ? s.items.map((i) => ({ q: i.title, a: i.text })) : s.type === 'faq' ? s.items : []));
  const steps = page.data.sections.find((s) => s.type === 'steps');
  const hero = page.data.sections.find((s) => s.type === 'hero');
  const jsonld: JsonLdInput = {
    path,
    title: page.data.title,
    description: page.data.description,
    lang,
    breadcrumbs: slug === 'home' ? undefined : await breadcrumbsFor(lang, slug, plain(page.data.h1 ?? page.data.title)),
    pricing: slug === 'home' || slug === 'pricing' ? pricing : undefined,
    faq: faq.length ? faq : undefined,
    howTo: steps && steps.type === 'steps' ? { name: steps.title ?? (hero && hero.type === 'hero' ? hero.title : page.data.title), steps: steps.items.map((i) => ({ name: i.title, text: i.text })) } : undefined,
  };
  return { ...data, translated, markdown, jsonld };
}

export async function allPages(lang: LanguageCode): Promise<LoadedPage[]> {
  const slugs = await pageSlugs();
  return Promise.all(slugs.map((s) => loadPage(lang, s)));
}

export { pageSlugs, slugToPath, defaultLanguage };
