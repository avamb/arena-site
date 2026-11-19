/**
 * JSON-LD from the same data as the HTML (doc 33 §3.10, item 3). One graph per page; CI checks
 * every page has Organization and the page-specific types.
 */
import type { Graph, Thing, Organization, WebSite, WebPage, Service, FAQPage, HowTo, Offer, BreadcrumbList, Article, Person } from 'schema-dts';
import type { Author } from './data';
import { org, siteUrl, hosts } from '@config';
import { plain, fill } from './inline';
import { tariff } from './data';
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
  /** A known author (authors.yaml) becomes a Person with sameAs; any other string a plain Person name. */
  article?: { headline: string; date: Date; updated?: Date; author: string; person?: Author };
  /** Author page: the Person is the page's main entity. */
  person?: Author;
};

const absolute = (path: string) => new URL(path, siteUrl).toString();

export function person(a: Author): Person {
  return {
    '@type': 'Person',
    '@id': `${absolute(a.page)}#person`,
    name: a.name,
    jobTitle: a.role,
    description: a.bio,
    url: absolute(a.page),
    ...(a.image ? { image: absolute(a.image) } : {}),
    sameAs: a.sameAs,
    worksFor: { '@id': `${siteUrl}/#organization` },
  };
}

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

// A SaaS ticketing service, typed as Service: SoftwareApplication is flagged by Semrush without a rating, which we do not have.
export function ticketingService(pricing: CollectionEntry<'pricing'>[]): Service {
  const offers: Offer[] = pricing.map((p) => ({
    '@type': 'Offer',
    name: `${p.data.region}: per ticket sold`,
    price: p.data.per_ticket.toFixed(2),
    priceCurrency: p.data.currency,
    description: `Platform commission per ticket sold: ${p.data.per_ticket.toFixed(2)} ${p.data.currency} without a seat, ${(p.data.per_ticket + p.data.seating_extra).toFixed(2)} ${p.data.currency} with a seat. Prepaid packages lower it. Invitations are free.`,
    url: absolute('/pricing'),
  }));
  return {
    '@type': 'Service',
    '@id': `${siteUrl}/#service`,
    name: org.name,
    serviceType: 'Online ticketing platform (SaaS)',
    category: 'Ticketing',
    url: siteUrl,
    availableChannel: { '@type': 'ServiceChannel', serviceUrl: hosts.telegramBot },
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed: org.region,
    offers,
  };
}

export function faqPage(items: { q: string; a: string }[], path: string): FAQPage {
  // Tariff placeholders ({percent}) are filled here as in the HTML and the Markdown twin.
  const vars = { percent: tariff.venues_percent };
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
  if (input.pricing) graph.push(ticketingService(input.pricing));
  if (input.faq && input.faq.length) graph.push(faqPage(input.faq, input.path));
  if (input.howTo) graph.push(howTo(input.howTo, input.path));
  if (input.person) { graph.push(person(input.person)); Object.assign(page, { mainEntity: { '@id': `${absolute(input.person.page)}#person` } }); }
  if (input.article) {
    const a: Article = {
      '@type': 'Article',
      '@id': `${absolute(input.path)}#article`,
      headline: input.article.headline,
      datePublished: input.article.date.toISOString(),
      dateModified: (input.article.updated ?? input.article.date).toISOString(),
      author: input.article.person ? { '@id': `${absolute(input.article.person.page)}#person` } : input.article.author === org.name ? { '@id': `${siteUrl}/#organization` } : { '@type': 'Person', name: input.article.author },
      publisher: { '@id': `${siteUrl}/#organization` },
      mainEntityOfPage: absolute(input.path),
      inLanguage: input.lang,
    };
    graph.push(a);
    if (input.article.person) graph.push(person(input.article.person));
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
