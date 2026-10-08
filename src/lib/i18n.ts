import { languages, defaultLanguage, type LanguageCode, type Language } from '@config';
import en from '../../i18n/en.json';

type Dict = Record<string, unknown>;

// Every language file is optional; missing keys fall back to `en` (doc 33 §3.6, item 3).
const dictionaries: Partial<Record<LanguageCode, Dict>> = { en: en as Dict };
const files = import.meta.glob<{ default: Dict }>('../../i18n/*.json', { eager: true });
for (const [path, mod] of Object.entries(files)) {
  const code = path.split('/').pop()!.replace('.json', '') as LanguageCode;
  dictionaries[code] = mod.default;
}

export function getLanguage(code: string | undefined): Language {
  return languages.find((l) => l.code === code) ?? languages.find((l) => l.code === defaultLanguage)!;
}

export function isLanguage(code: string | undefined): code is LanguageCode {
  return languages.some((l) => l.code === code);
}

/** Languages that get routes in this build (menu-enabled). Others exist in config only. */
export function activeLanguages(): Language[] {
  return languages.filter((l) => l.inMenu);
}

export function t(lang: LanguageCode, key: string, vars: Record<string, string | number> = {}): string {
  const value = (dictionaries[lang]?.[key] ?? dictionaries[defaultLanguage]?.[key] ?? key) as string;
  return String(value).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function tObject<T>(lang: LanguageCode, key: string): T {
  return (dictionaries[lang]?.[key] ?? dictionaries[defaultLanguage]?.[key]) as T;
}

/**
 * Pages that exist in each language, from the content folder: content/ru/pages/blog.yaml → ru has "/blog".
 * A language in the menu gets every route (missing translations fall back to English with a note);
 * a language outside the menu gets only the routes it has content for, everything else links to English.
 */
// Only the keys are used; `?raw` keeps Vite from parsing YAML as JavaScript.
const pageFiles = import.meta.glob('../../content/*/pages/**/*.yaml', { query: '?raw', import: 'default' });
const ownRoutes = new Map<string, Set<string>>();
for (const key of Object.keys(pageFiles)) {
  const m = key.match(/content\/(\w+)\/pages\/(.+)\.yaml$/);
  if (!m) continue;
  const [, code, slug] = m;
  if (!ownRoutes.has(code)) ownRoutes.set(code, new Set());
  ownRoutes.get(code)!.add(slug === 'home' ? '/' : `/${slug}`);
}

function hasRoute(lang: LanguageCode, href: string): boolean {
  const path = href.replace(/[#?].*$/, '') || '/';
  const own = ownRoutes.get(lang);
  if (!own) return false;
  if (own.has(path)) return true;
  // blog posts live under the blog index
  return path.startsWith('/blog/') && own.has('/blog');
}

/** Prefix a site route with the language segment; external links pass through. */
export function localePath(lang: LanguageCode, href: string): string {
  if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('#')) return href;
  if (lang === defaultLanguage) return href;
  if (!getLanguage(lang).inMenu && !hasRoute(lang, href)) return href;
  if (href === '/') return `/${lang}`;
  return `/${lang}${href}`;
}

/** Blog posts always live under their own language prefix, even for languages outside the menu (archive policy). */
export function postPath(lang: LanguageCode, slug: string): string {
  return lang === defaultLanguage ? `/blog/${slug}` : `/${lang}/blog/${slug}`;
}

/** Static paths for the `[...locale]` rest parameter: undefined for the default language. */
export function localeStaticPaths() {
  return activeLanguages().map((l) => ({
    params: { locale: l.code === defaultLanguage ? undefined : l.code },
    props: { lang: l.code },
  }));
}

export function formatDate(lang: LanguageCode, date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getLanguage(lang).intl, { ...options, timeZone: 'UTC' }).format(date);
}

export function formatMoney(lang: LanguageCode, amount: number, currency: string): string {
  return new Intl.NumberFormat(getLanguage(lang).intl, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat('en-GB', { style: 'currency', currency }).formatToParts(1);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}
