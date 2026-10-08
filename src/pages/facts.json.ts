/** /facts.json: the same data as /facts, for agents and for the future MCP wrapper (doc 33 §3.10, items 4 and 12). */
import type { APIRoute } from 'astro';
import { facts, tariff, clients, getProviders, getMarkets, getPricing, getChangelog } from '@/lib/data';
import { siteUrl, org, languages } from '@config';

export const GET: APIRoute = async () => {
  const [providers, markets, pricing, changelog] = await Promise.all([getProviders(), getMarkets(), getPricing(), getChangelog()]);
  const body = {
    $schema: `${siteUrl}/facts.json`,
    organization: { name: org.name, legalName: org.legalName, since: org.foundingYear, region: org.region, url: siteUrl },
    updated: facts.updated.toISOString().slice(0, 10),
    capabilities: facts.capabilities.map((c) => ({ name: c.name, status: c.status, since: c.since?.toISOString().slice(0, 10), note: c.note })),
    pricing: {
      unit: 'per ticket sold, platform service, invoiced after each session',
      regions: pricing.map((p) => ({ region: p.data.region, currency: p.data.currency, per_ticket: p.data.per_ticket, with_seating_plan: +(p.data.per_ticket + p.data.seating_extra).toFixed(2), invitations_and_refunds: 0, white_label_per_event: p.data.white_label_per_event })),
      permanent_venues_percent: tariff.venues_percent,
      invoicing: tariff.invoicing,
      terms_url: `${siteUrl}/pricing/terms`,
    },
    providers: providers.map((p) => ({ id: p.id, name: p.data.name, status: p.data.status, hosted_checkout: p.data.hosted_checkout, regions: p.data.regions, currencies: p.data.currencies, methods: p.data.methods, since: p.data.since?.toISOString().slice(0, 10), note: p.data.note })),
    markets: markets.map((m) => ({ iso2: m.data.iso2, name: m.data.name.en, status: m.data.status, group: m.data.group, currencies: m.data.currencies, providers: m.data.providers, languages: m.data.languages })),
    languages: { site: languages.filter((l) => l.inMenu).map((l) => l.code), site_planned: languages.filter((l) => !l.inMenu).map((l) => l.code), buyer_page: facts.languages.buyer_page, emails: facts.languages.emails },
    limits: { orders_per_minute: facts.limits.orders_per_minute, concurrent_visitors: facts.limits.concurrent_visitors, load_test_date: facts.limits.load_test_date.toISOString().slice(0, 10) },
    backups: facts.backups,
    clients: { countries: clients.countries, since: clients.countries_since, marks: clients.marks.map((m) => m.name), founders_track_record: clients.track_record },
    changelog: changelog.map((c) => ({ date: c.data.date.toISOString().slice(0, 10), title: c.data.title })),
    links: { llms: `${siteUrl}/llms.txt`, llms_full: `${siteUrl}/llms-full.txt`, facts: `${siteUrl}/facts`, developers: `${siteUrl}/developers` },
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
