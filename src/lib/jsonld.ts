/**
 * JSON-LD from the same data as the HTML (doc 33 §3.10, item 3). One graph per page; CI checks
 * every page has Organization and the page-specific types.
 */
import type { Graph, Thing, Organization, WebSite, WebPage, SoftwareApplication, FAQPage, HowTo, Offer, BreadcrumbList, Article } from 'schema-dts';
import { org, siteUrl, hosts } from '@config';
import { plain, fill } from './inline';
import { tariff } from './data';
import { currencySymbol } from './i18n';
import type { CollectionEntry } from 'astro:content';

export type JsonLdInput = {
  path: string;
  title: string;
  description: string;
  lang: string;
  breadcrumbs?: { name: string; path: string }[];
  pricing?: CollectionEntry<'pricing'>[];
  faq?: { q: string; a: string }[];
  howTo?: { name: string; steps: { name: string; text: string }[] };
  article?: { headline: string; date: Date; updated?: Date; author: string };
};

const absolute = (path: string) => new URL(path, siteUrl).toString();

export function organization(): Organization {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: org.name,
    legalName: org.legalName,
    url: siteUrl,
    logo: absolute(org.logo),
    foundingDate: String(org.foundingYear),
    email: org.contactEmail,
    sameAs: org.sameAs,
    areaServed: org.region,
  };
}

export function website(): WebSite {
  return { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: org.name, publisher: { '@id': `${siteUrl}/#organization` } };
}

export function softwareApplication(pricing: CollectionEntry<'pricing'>[]): SoftwareApplication {
  const offers: Offer[] = pricing.map((p) => ({
    '@type': 'Offer',
    name: `${p.data.region}: per ticket sold`,
    price: p.data.per_ticket.toFixed(2),
    priceCurrency: p.data.currency,
    description: `Platform service per ticket sold. Events with a seating plan add ${p.data.seating_extra.toFixed(2)} ${p.data.currency} per ticket. Invitations and refunds are free.`,
    url: absolute('/pricing'),
  }));
  return {
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: org.name,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Ticketing',
    operatingSystem: 'Web, Telegram',
    url: siteUrl,
    installUrl: hosts.telegramBot,
    provider: { '@id': `${siteUrl}/#organization` },
    offers,
  };
}

export function faqPage(items: { q: string; a: string }[], path: string): FAQPage {
  // Tariff placeholders ({percent}, {whitelabel}) are filled here as in the HTML and the Markdown twin.
  const vars = { percent: tariff.venues_percent, whitelabel: currencySymbol(tariff.white_label_currency) + tariff.white_label_per_event };
  return {
    '@type': 'FAQPage',
    '@id': `${absolute(path)}#faq`,
    mainEntity: items.map((i) => ({ '@type': 'Question', name: plain(i.q), acceptedAnswer: { '@type': 'Answer', text: plain(fill(i.a, vars)) } })),
  };
}

export function howTo(input: NonNullable<JsonLdInput['howTo']>, path: string): HowTo {
  return {
    '@type': 'HowTo',
    '@id': `${absolute(path)}#howto`,
    name: plain(input.name),
    step: input.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: plain(s.name), text: plain(s.text) })),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: absolute(b.path) })),
  };
}

export function buildGraph(input: JsonLdInput): Graph {
  const page: WebPage = {
    '@type': 'WebPage',
    '@id': absolute(input.path),
    url: absolute(input.path),
    name: input.title,
    description: input.description,
    inLanguage: input.lang,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
  };
  const graph: Thing[] = [organization(), website(), page];
  if (input.breadcrumbs && input.breadcrumbs.length > 1) graph.push(breadcrumbs(input.breadcrumbs));
  if (input.pricing) graph.push(softwareApplication(input.pricing));
  if (input.faq && input.faq.length) graph.push(faqPage(input.faq, input.path));
  if (input.howTo) graph.push(howTo(input.howTo, input.path));
  if (input.article) {
    const a: Article = {
      '@type': 'Article',
      '@id': `${absolute(input.path)}#article`,
      headline: input.article.headline,
      datePublished: input.article.date.toISOString(),
      dateModified: (input.article.updated ?? input.article.date).toISOString(),
      author: input.article.author === org.name ? { '@id': `${siteUrl}/#organization` } : { '@type': 'Person', name: input.article.author },
      publisher: { '@id': `${siteUrl}/#organization` },
      mainEntityOfPage: absolute(input.path),
      inLanguage: input.lang,
    };
    graph.push(a);
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
