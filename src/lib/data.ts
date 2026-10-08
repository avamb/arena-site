/**
 * Singleton data files (one YAML object each) with zod schemas, plus typed accessors over the
 * multi-entry collections. Keystatic maps these onto "singletons" later without changing paths.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'astro:content';
import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLanguage, type LanguageCode } from '@config';

const root = new URL('../../content/data/', import.meta.url);

function load<T>(file: string, schema: z.ZodType<T>): T {
  const raw = readFileSync(new URL(file, root), 'utf8');
  return schema.parse(parse(raw));
}

const linkSchema = z.object({ label: z.string(), href: z.string() });

export const navSchema = z.object({
  header: z.array(linkSchema),
  signin: linkSchema,
  start: linkSchema,
  tagline: z.string(),
  footer: z.array(z.object({ title: z.string(), links: z.array(linkSchema) })),
  copyright: z.string(),
});

export const clientsSchema = z.object({
  countries_since: z.number(),
  countries: z.number(),
  marks: z.array(z.object({ name: z.string(), kind: z.string() })),
  track_record: z.array(z.string()),
});

export const tariffSchema = z.object({
  venues_percent: z.number(),
  invoicing: z.string(),
  invoicing_monthly_after_months: z.number(),
  calculator: z.object({ default_price: z.number(), default_quantity: z.number(), currency: z.string() }),
});

export const factsSchema = z.object({
  updated: z.coerce.date(),
  capabilities: z.array(z.object({ name: z.string(), status: z.enum(['yes', 'no', 'partial']), since: z.coerce.date().optional(), note: z.string().optional() })),
  languages: z.object({ buyer_page: z.array(z.string()), emails: z.number(), site: z.array(z.string()) }),
  limits: z.object({ orders_per_minute: z.number(), concurrent_visitors: z.number(), load_test_date: z.coerce.date() }),
  backups: z.string(),
});

export type Nav = z.infer<typeof navSchema>;
export type Clients = z.infer<typeof clientsSchema>;
export type Tariff = z.infer<typeof tariffSchema>;
export type Facts = z.infer<typeof factsSchema>;

export const nav: Nav = load('nav.yaml', navSchema);
export const clients: Clients = load('clients.yaml', clientsSchema);
export const tariff: Tariff = load('tariff.yaml', tariffSchema);
export const facts: Facts = load('facts.yaml', factsSchema);

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getProviders(status?: 'live' | 'api' | 'planned') {
  const all = (await getCollection('providers')).sort(byOrder);
  return status ? all.filter((p) => p.data.status === status) : all;
}

export async function getMarkets(status?: 'live' | 'planned') {
  const all = (await getCollection('markets')).sort(byOrder);
  return status ? all.filter((m) => m.data.status === status) : all;
}

export async function getPricing() {
  return (await getCollection('pricing')).sort(byOrder);
}

export async function getChangelog(limit?: number) {
  const all = (await getCollection('changelog')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return limit ? all.slice(0, limit) : all;
}

export async function getPosts(lang: LanguageCode) {
  const all = await getCollection('posts', (p) => p.id.startsWith(`${lang}/`) && !p.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export type PageEntry = CollectionEntry<'pages'>;

/**
 * Page for a language with fallback to `en` (doc 33 §3.6): a missing translation shows the
 * English page with a note and `noindex`, never a 404.
 */
export async function getPage(lang: LanguageCode, slug: string): Promise<{ page: PageEntry; translated: boolean }> {
  const wanted = `${lang}/pages/${slug}`;
  const all = await getCollection('pages');
  const hit = all.find((p) => p.id === wanted);
  if (hit) return { page: hit, translated: true };
  const fallback = all.find((p) => p.id === `${defaultLanguage}/pages/${slug}`);
  if (!fallback) throw new Error(`Page not found in any language: ${slug}`);
  return { page: fallback, translated: lang === defaultLanguage };
}

/** Slugs of every page that exists in the default language, in site order. */
export async function pageSlugs(): Promise<string[]> {
  const all = await getCollection('pages');
  const order = ['home', 'pricing', 'pricing/terms', 'payments', 'developers', 'clients', 'facts', 'blog', 'changes', 'start', 'start/thanks'];
  const slugs = all.filter((p) => p.id.startsWith(`${defaultLanguage}/pages/`)).map((p) => p.id.replace(`${defaultLanguage}/pages/`, ''));
  return slugs.sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));
}

export function slugToPath(slug: string): string {
  return slug === 'home' ? '/' : `/${slug}`;
}

export function liveProviderNames(providers: CollectionEntry<'providers'>[]): string[] {
  return providers.filter((p) => p.data.status !== 'planned').map((p) => p.data.name);
}

export function liveMarketNames(markets: CollectionEntry<'markets'>[], lang: LanguageCode): string[] {
  return markets.filter((m) => m.data.status === 'live').map((m) => m.data.name[lang] ?? m.data.name[defaultLanguage]);
}
