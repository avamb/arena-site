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
  /** "Contact the team" (doc 51 §1.3): opens the dialog; without JavaScript the link goes to the form on /contact. */
  contact: linkSchema,
  tagline: z.string(),
  footer: z.array(z.object({ title: z.string(), links: z.array(linkSchema) })),
  copyright: z.string(),
});

export const clientsSchema = z.object({
  countries_since: z.number(),
  countries: z.number(),
  marks: z.array(z.object({ name: z.string(), kind: z.string().optional() })),
  track_record: z.array(z.string()),
});

export const tariffSchema = z.object({
  venues_percent: z.number(),
  low_price: z.object({ max_ticket: z.number(), percent: z.number(), min: z.number(), max: z.number(), seating_extra: z.number() }),
  package_seating_extra: z.number(),
  packages: z.array(z.object({ name: z.string(), prepay: z.number(), per_ticket: z.number() })),
  invoicing: z.string(),
  invoicing_monthly_after_months: z.number(),
  calculator: z.object({ default_price: z.number(), default_quantity: z.number(), currency: z.string() }),
  /** Euro prices: the US dollar is the base, euro amounts are the dollar ones at `rate` (owner's decision of 09.11.2026). */
  eur: z.object({
    rate: z.number(),
    rate_date: z.coerce.date(),
    rate_source: z.string(),
    stripe_links_current: z.boolean(),
    low_price: z.object({ max_ticket: z.number(), percent: z.number(), min: z.number(), max: z.number(), seating_extra: z.number() }),
    package_seating_extra: z.number(),
    packages: z.array(z.object({ name: z.string(), prepay: z.number(), per_ticket: z.number() })),
  }),
});

export const factsSchema = z.object({
  updated: z.coerce.date(),
  capabilities: z.array(z.object({ name: z.string(), status: z.enum(['yes', 'no', 'partial']), since: z.coerce.date().optional(), note: z.string().optional() })),
  languages: z.object({ buyer_page: z.array(z.string()), emails: z.number(), site: z.array(z.string()) }),
  limits: z.object({ orders_per_minute: z.number(), concurrent_visitors: z.number(), load_test_date: z.coerce.date() }),
  backups: z.string(),
});

/** Stripe Payment Links of the prepaid packages: links[package][currency]. Empty until scripts/stripe-packages.mjs has run. */
/** The currency-dependent part of the tariff: US dollars are the base, euros come from `tariff.eur`. */
export function tariffFor(currency: string) {
  const e = tariff.eur;
  return currency.toUpperCase() === 'EUR'
    ? { low_price: e.low_price, package_seating_extra: e.package_seating_extra, packages: e.packages }
    : { low_price: tariff.low_price, package_seating_extra: tariff.package_seating_extra, packages: tariff.packages };
}
export const packageLinksSchema = z.object({ links: z.record(z.string(), z.record(z.string(), z.string().url())).default({}) });

export type Nav = z.infer<typeof navSchema>;
export type Clients = z.infer<typeof clientsSchema>;
export type Tariff = z.infer<typeof tariffSchema>;
export type Facts = z.infer<typeof factsSchema>;

export const nav: Nav = load('nav.yaml', navSchema);
export const clients: Clients = load('clients.yaml', clientsSchema);
export const tariff: Tariff = load('tariff.yaml', tariffSchema);
export const facts: Facts = load('facts.yaml', factsSchema);
export const packageLinks: Record<string, Record<string, string>> = (load('package-links.yaml', packageLinksSchema).links ?? {});

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
  const order = ['home', 'product/sell', 'product/seating', 'product/pricing-tools', 'payments', 'product/telegram', 'product/tickets', 'product/reliability', 'solutions', 'solutions/concerts', 'solutions/theatre', 'solutions/shows', 'solutions/festivals', 'solutions/concert-tours', 'solutions/master-classes', 'solutions/venues', 'solutions/wordpress', 'pricing', 'pricing/terms', 'developers', 'clients', 'company', 'facts', 'blog', 'changes', 'start', 'contact', 'partners', 'help/tickets', 'legal/terms', 'legal/privacy', 'start/thanks'];
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

/**
 * Placeholders of the home "reasons" block, from the price and client data so the copy never
 * carries a number of its own: {price} and {seated} per ticket in both currencies, {countries}, {since}.
 */
/**
 * Our prices as text placeholders for prose, FAQ, cards and comparison tables: {usdPrice}, {usdSeated},
 * {usdFrom}, {usdFromSeated}, {usdLowMax}, the same with the eur prefix, and {fromSaving} (percent).
 */
export function priceVars(pricing: CollectionEntry<'pricing'>[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const p of pricing) {
    const c = p.data.currency;
    const k = c.toLowerCase();
    const sym = c === 'USD' ? 'US$' : c === 'EUR' ? '€' : c + ' ';
    const m = (n: number) => `${sym}${n.toFixed(2)}`;
    const tf = tariffFor(c);
    const minPack = Math.min(...tf.packages.map((x) => x.per_ticket));
    out[`${k}Price`] = m(p.data.per_ticket);
    out[`${k}Seated`] = m(p.data.per_ticket + p.data.seating_extra);
    out[`${k}From`] = m(minPack);
    out[`${k}FromSeated`] = m(minPack + tf.package_seating_extra);
    out[`${k}LowMax`] = `${sym}${tf.low_price.max_ticket}`;
    if (c === 'USD') out.fromSaving = Math.round((1 - minPack / p.data.per_ticket) * 100);
  }
  out.lowPercent = tariff.low_price.percent;
  return out;
}

export function reasonVars(pricing: CollectionEntry<'pricing'>[]): Record<string, string | number> {
  const sym = (c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).formatToParts(1).find((p) => p.type === 'currency')?.value ?? c;
  const both = (f: (p: CollectionEntry<'pricing'>) => number) => pricing.map((p) => `${sym(p.data.currency)}${f(p).toFixed(2)}`).join(' / ');
  return {
    price: both((p) => p.data.per_ticket),
    seated: both((p) => p.data.per_ticket + p.data.seating_extra),
    countries: clients.countries,
    since: clients.countries_since,
  };
}
