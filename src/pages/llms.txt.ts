/** llms.txt (Answer.AI standard): who we are in one paragraph, key pages with one line each, Markdown links. */
import type { APIRoute } from 'astro';
import { allPages, slugToPath } from '@/lib/pages';
import { siteUrl, org, defaultLanguage } from '@config';
import { plain } from '@/lib/inline';
import { facts, clients } from '@/lib/data';
import { activeLanguages } from '@/lib/i18n';

export const GET: APIRoute = async () => {
  // The application steps under /start/ (thanks, confirm, continue) are noindex utility pages, not content for an answer.
  const pages = (await allPages(defaultLanguage)).filter((p) => !p.page.id.split('/pages/')[1].startsWith('start/'));
  const translated = activeLanguages().filter((l) => l.code !== defaultLanguage);
  const home = pages[0];
  const lines = [
    `# ${org.name}`,
    '',
    `> ${plain(home.page.data.description)}`,
    '',
    `${org.name} (${org.legalName}, a company registered in the ${org.region}; organizers in ${clients.countries} countries since ${clients.countries_since}) is ticketing infrastructure for event organizers: reserved seating and general admission, the organizer's own payment account, a hosted sales page or a widget on the organizer's site, an organizer bot in Telegram. It is not a marketplace. Facts with dates: ${siteUrl}/facts (JSON: ${siteUrl}/facts.json). Updated ${facts.updated.toISOString().slice(0, 10)}.`,
    '',
    '## Pages',
    '',
    ...pages.map((p) => {
      const slug = p.page.id.split('/pages/')[1];
      const path = slugToPath(slug);
      const md = path === '/' ? '/index.md' : `${path}.md`;
      return `- [${plain(p.page.data.h1 ?? p.page.data.title)}](${siteUrl}${md}): ${plain(p.page.data.description)}`;
    }),
    '',
    '## Languages',
    '',
    `Every page above also exists in ${translated.map((l) => l.name).join(', ')}: the same address with the language prefix, with its own Markdown twin (for example ${siteUrl}/de/pricing and ${siteUrl}/de/pricing.md). Home pages:`,
    '',
    ...translated.map((l) => `- [${l.name}](${siteUrl}/${l.code}/index.md)`),
    '',
    '## Machine-readable',
    '',
    `- [facts.json](${siteUrl}/facts.json): capabilities with status and dates, pricing per currency, providers, markets, languages, limits`,
    `- [llms-full.txt](${siteUrl}/llms-full.txt): every page above in one Markdown file`,
    `- [sitemap](${siteUrl}/sitemap-index.xml)`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
