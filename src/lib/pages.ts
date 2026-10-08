/**
 * Everything a route needs for one page in one language: content with fallback, data
 * collections, Markdown twin, JSON-LD inputs. Used by the HTML routes, the `.md` twins,
 * `llms.txt` and `llms-full.txt`, so they can never disagree.
 */
import { defaultLanguage, type LanguageCode } from '@config';
import { getPage, getProviders, getMarkets, getPricing, getChangelog, getPosts, pageSlugs, slugToPath, nav } from './data';
import { pageToMarkdown, type PageData } from './markdown';
import { localePath } from './i18n';
import type { JsonLdInput } from './jsonld';
import { plain } from './inline';

export type LoadedPage = PageData & { translated: boolean; markdown: string; jsonld: JsonLdInput };

export async function loadPage(lang: LanguageCode, slug: string): Promise<LoadedPage> {
  const { page, translated } = await getPage(lang, slug);
  const [providers, markets, pricing, changelog, posts] = await Promise.all([getProviders(), getMarkets(), getPricing(), getChangelog(), getPosts(lang)]);
  const path = localePath(lang, slugToPath(slug));
  const data: PageData = { lang, path, page, providers, markets, pricing, changelog, posts };
  const markdown = pageToMarkdown(data, nav);

  const faq = page.data.sections.flatMap((s) => (s.type === 'qa' ? s.items.map((i) => ({ q: i.title, a: i.text })) : s.type === 'faq' ? s.items : []));
  const steps = page.data.sections.find((s) => s.type === 'steps');
  const hero = page.data.sections.find((s) => s.type === 'hero');
  const jsonld: JsonLdInput = {
    path,
    title: page.data.title,
    description: page.data.description,
    lang,
    breadcrumbs: slug === 'home' ? undefined : [{ name: 'Home', path: localePath(lang, '/') }, ...slug.split('/').map((_, i, arr) => ({ name: i === arr.length - 1 ? plain(page.data.h1 ?? page.data.title) : arr[i], path: localePath(lang, '/' + arr.slice(0, i + 1).join('/')) }))],
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
