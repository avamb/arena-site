/**
 * Markdown twin of a page (doc 33 §3.10, item 2): the same sections rendered as Markdown for
 * agents. Never written by hand; `/pricing.md` is produced from the same YAML as `/pricing`.
 */
import type { CollectionEntry } from 'astro:content';
import type { Section } from '../content.config';
import { siteUrl, org, type LanguageCode } from '@config';
import { plain, fill } from './inline';
import { clients, tariff, facts, liveProviderNames, reasonVars, type Nav } from './data';
import { formatDate, currencySymbol, postPath } from './i18n';

export type PageData = {
  lang: LanguageCode;
  path: string;
  page: CollectionEntry<'pages'>;
  providers: CollectionEntry<'providers'>[];
  markets: CollectionEntry<'markets'>[];
  pricing: CollectionEntry<'pricing'>[];
  changelog: CollectionEntry<'changelog'>[];
  posts: CollectionEntry<'posts'>[];
};

const abs = (p: string) => (p.startsWith('/') ? new URL(p, siteUrl).toString() : p);
const money = (amount: number, currency: string) => `${currencySymbol(currency)}${amount.toFixed(2)}`;
const vars = { percent: tariff.venues_percent };

export function sectionToMarkdown(s: Section, d: PageData): string {
  const out: string[] = [];
  const h2 = (t?: string) => t && out.push(`## ${plain(t)}`, '');
  const lead = (t?: string) => t && out.push(plain(t), '');
  switch (s.type) {
    case 'hero':
      out.push(`# ${plain(s.title)}`, '', plain(s.lead ?? ''), '', `- [${s.primary.label}](${abs(s.primary.href)})`, `- [${s.secondary.label}](${abs(s.secondary.href)})`, '', plain(s.note), '');
      break;
    case 'facts':
      s.items.forEach((i) => out.push(`- ${plain(i)}`));
      out.push('');
      break;
    case 'steps':
      h2(s.title); lead(s.lead);
      s.items.forEach((i, n) => out.push(`${n + 1}. **${plain(i.title)}** ${plain(i.text)}`));
      out.push('');
      if (s.note) out.push(plain(s.note), '');
      break;
    case 'ways':
      h2(s.title); lead(s.lead);
      s.items.forEach((i) => { out.push(`### ${plain(i.title)}`, '', plain(i.text), ''); i.bullets.forEach((b) => out.push(`- ${plain(b)}`)); out.push(''); });
      break;
    case 'qa':
      h2(s.title); lead(s.lead);
      s.items.forEach((i) => out.push(`### ${plain(i.title)}`, '', plain(i.text), ''));
      break;
    case 'center':
      h2(s.title); lead(s.lead);
      s.bullets.forEach((b) => out.push(`- ${plain(b)}`));
      out.push('', plain(s.note), '');
      break;
    case 'money': {
      h2(s.title); lead(s.lead);
      const names = liveProviderNames(d.providers).join(', ');
      out.push(s.nodes.map((n) => plain(n.label) + (n.providers ? ` (${names})` : n.sub ? ` (${plain(n.sub)})` : '')).join(' → '), '', plain(s.note), '');
      break;
    }
    case 'pricing': {
      h2(s.title); lead(s.lead);
      const cur = d.pricing[0].data.currency;
      const seat = d.pricing[0].data.per_ticket + d.pricing[0].data.seating_extra;
      const lp = tariff.low_price;
      out.push('| Region | Without a seat | With a seat | Invitations |', '|---|---|---|---|');
      d.pricing.forEach((p) => out.push(`| ${p.data.region} | ${money(p.data.per_ticket, p.data.currency)} | ${money(p.data.per_ticket + p.data.seating_extra, p.data.currency)} | free |`));
      out.push('', plain(s.currencyNote), '');
      if (s.packages) {
        out.push(`**${s.packages.title}**`, '', plain(s.packages.text), '');
        const c = s.packages.cols;
        out.push(`| ${c.name} | ${c.prepay} | ${c.plain} | ${c.seated} | ${c.plainCount} | ${c.seatedCount} | ${c.saving} |`, '|---|---|---|---|---|---|---|');
        tariff.packages.forEach((k) => {
          const f = (x: number) => Math.round(x * 100);
          out.push(`| ${k.name} | ${money(k.prepay, cur)} | ${money(k.per_ticket, cur)} | ${money(k.per_ticket + tariff.package_seating_extra, cur)} | ${Math.floor(f(k.prepay) / f(k.per_ticket))} | ${Math.floor(f(k.prepay) / f(k.per_ticket + tariff.package_seating_extra))} | ${Math.round((1 - k.per_ticket / d.pricing[0].data.per_ticket) * 100)}% |`);
        });
        out.push('', plain(s.packages.note), '');
      }
      const lpv = { lowMax: `${currencySymbol(cur)}${lp.max_ticket}`, lowPercent: lp.percent, lowMin: money(lp.min, cur), lowCap: money(lp.max, cur), lowSeat: money(lp.seating_extra, cur), percent: tariff.venues_percent, cap: money(seat, cur) };
      out.push(`**${plain(fill(s.lowPrice.title, lpv))}**`, '', plain(fill(s.lowPrice.text, lpv)), '');
      out.push(`**${s.venues.title}**`, '', plain(fill(s.venues.text, lpv)), '', plain(s.note), '', `[${s.terms.label}](${abs(s.terms.href)})`, '');
      break;
    }
    case 'who':
      h2(s.title); lead(s.lead);
      s.items.forEach((i) => out.push(`- **${plain(i.title)}**: ${plain(i.text)}`));
      out.push('');
      break;
    case 'reasons': {
      const rv = reasonVars(d.pricing);
      h2(s.title); lead(s.lead && fill(s.lead, rv));
      s.items.forEach((i) => {
        out.push(`### ${plain(fill(i.title, rv))}`, '', plain(fill(i.text, rv)), '');
        i.bullets?.forEach((b) => out.push(`- ${plain(fill(b, rv))}`));
        if (i.bullets) out.push('');
        if (i.link) out.push(`[${i.link.label}](${abs(i.link.href)})`, '');
      });
      break;
    }
    case 'clients':
      h2(fill(s.title ?? '', { countries: clients.countries }));
      lead(fill(s.lead ?? '', { since: clients.countries_since, track: clients.track_record.join(', ') }));
      out.push(clients.marks.map((m) => m.name).join(', '), '');
      break;
    case 'changes':
      h2(s.title); lead(s.lead);
      d.changelog.slice(0, s.limit).forEach((c) => out.push(`- ${c.data.date.toISOString().slice(0, 10)}: ${c.data.title}`));
      out.push('', `[${s.more.label}](${abs(s.more.href)})`, '');
      break;
    case 'cta':
      h2(s.title);
      out.push(plain(s.text), '', `- [${s.primary.label}](${abs(s.primary.href)})`, `- [${s.secondary.label}](${abs(s.secondary.href)})`, '', plain(s.note), '');
      break;
    case 'prose':
      h2(s.title); out.push(fill(s.body, vars).trim(), '');
      break;
    case 'faq':
      h2(s.title); lead(s.lead);
      s.items.forEach((i) => out.push(`### ${plain(i.q)}`, '', plain(fill(i.a, vars)), ''));
      break;
    case 'providers': {
      h2(s.title); lead(s.lead);
      out.push(`| Provider | Status | ${s.labels.currencies} | ${s.labels.methods} | ${s.labels.checkout} |`, '|---|---|---|---|---|');
      d.providers.forEach((p) => out.push(`| ${p.data.name} | ${s.labels.statuses[p.data.status] ?? p.data.status} | ${p.data.currencies.join(', ')} | ${p.data.methods.map((m) => s.labels.methods_map[m] ?? m).join(', ')} | ${p.data.hosted_checkout ? 'yes' : 'no'} |`));
      out.push('');
      d.providers.forEach((p) => p.data.note && out.push(`- **${p.data.name}**: ${p.data.note}`));
      out.push('');
      break;
    }
    case 'coverage': {
      h2(s.title); lead(fill(s.lead ?? '', { countries: clients.countries, since: clients.countries_since }));
      const names = new Intl.DisplayNames([d.lang], { type: 'region' });
      d.providers.filter((p) => p.data.entity_countries.length).forEach((p) => out.push(`### ${p.data.name} (${p.data.entity_countries.length})`, '', p.data.entity_countries.map((c) => names.of(c) ?? c).sort((a, b) => a.localeCompare(b, d.lang)).join(', '), ''));
      out.push(`${s.labels.note} ${s.labels.missing} [${s.cta.label}](${abs(s.cta.href)})`, '');
      break;
    }
    case 'markets': {
      h2(s.title); lead(s.lead);
      out.push('| Country | Currencies | Providers |', '|---|---|---|');
      d.markets.filter((m) => m.data.status === 'live').forEach((m) => out.push(`| ${m.data.name[d.lang] ?? m.data.name.en} | ${m.data.currencies.join(', ')} | ${m.data.providers.map((id) => d.providers.find((p) => p.id === id)?.data.name ?? id).join(', ')} |`));
      const groups = [...new Set(d.markets.filter((m) => m.data.status === 'planned').map((m) => m.data.group ?? m.data.name.en))];
      out.push('', `### ${plain(s.preparing.title)}`, '', plain(s.preparing.text), '', groups.map((g) => `- ${g}`).join('\n'), '');
      break;
    }
    case 'cards':
      h2(s.title); lead(s.lead);
      s.items.forEach((i) => out.push(`### ${plain(i.title)}`, '', plain(i.text), '', i.link ? `[${i.link.label}](${abs(i.link.href)})` : '', ''));
      break;
    case 'code':
      h2(s.title); lead(s.lead);
      out.push('```html', s.code.trim(), '```', '');
      s.items.forEach((i) => out.push(`- \`${i.key}\`: ${plain(i.text)}`));
      out.push('', `[${s.cta.label}](${abs(s.cta.href)})`, '');
      break;
    case 'marks':
      h2(s.title); lead(s.lead);
      clients.marks.forEach((m) => out.push(`- ${m.name}`));
      out.push('');
      break;
    case 'changelog':
      h2(s.title); lead(s.lead);
      d.changelog.forEach((c) => out.push(`- ${c.data.date.toISOString().slice(0, 10)}: ${c.data.title}`));
      out.push('');
      break;
    case 'posts':
      h2(s.title); lead(s.lead);
      if (!d.posts.length) out.push(plain(s.empty), '');
      d.posts.forEach((p) => out.push(`- ${p.data.date.toISOString().slice(0, 10)}: [${p.data.title}](${abs(postPath(d.lang, p.id.split('/').pop()!))})`));
      out.push('');
      break;
    case 'facts-table':
      h2(s.title); lead(s.lead);
      out.push('| Capability | Status | Since | Note |', '|---|---|---|---|');
      facts.capabilities.forEach((c) => out.push(`| ${c.name} | ${c.status} | ${c.since ? c.since.toISOString().slice(0, 10) : ''} | ${c.note ?? ''} |`));
      out.push('', `Buyer page languages: ${facts.languages.buyer_page.join(', ')}; any other language can be integrated on request. E-mails in ${facts.languages.emails} languages. Load test ${formatDate(d.lang, facts.limits.load_test_date, { dateStyle: 'medium' })}: ${facts.limits.orders_per_minute} orders a minute at ${facts.limits.concurrent_visitors} concurrent visitors. Backups: ${facts.backups}.`, '', `Updated ${facts.updated.toISOString().slice(0, 10)}.`, '');
      break;
    case 'contact-form':
      h2(s.title); lead(s.lead);
      out.push(`Fields: name, e-mail, topic, question. Or write to ${org.contactEmail}.`, '');
      break;
    case 'onboarding':
      h2(s.title); lead(s.lead);
      if (s.alt) out.push(`${plain(s.alt.text)} [${s.alt.link.label}](${abs(s.alt.link.href)})`, '');
      break;
  }
  return out.join('\n');
}

export function pageToMarkdown(d: PageData, nav: Nav): string {
  const { page } = d;
  const head: string[] = [];
  const hasHero = page.data.sections.some((s) => s.type === 'hero');
  if (!hasHero) head.push(`# ${plain(page.data.h1 ?? page.data.title)}`, '', plain(page.data.lead ?? page.data.description), '');
  const body = page.data.sections.map((s) => sectionToMarkdown(s, d)).join('\n');
  const footer = ['---', '', `${nav.copyright}. Canonical: ${abs(d.path)}. Facts: ${abs('/facts')}. All pages: ${abs('/llms.txt')}.`, ''];
  return [`<!-- ${plain(page.data.title)} · ${abs(d.path)} · generated from content/${page.id}.yaml -->`, '', ...head, body, ...footer].join('\n');
}
