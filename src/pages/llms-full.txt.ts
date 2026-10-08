/** llms-full.txt: the whole site as one Markdown file (pages and changelog, no blog archive). */
import type { APIRoute } from 'astro';
import { allPages } from '@/lib/pages';
import { siteUrl, org, defaultLanguage } from '@config';

export const GET: APIRoute = async () => {
  const pages = (await allPages(defaultLanguage)).filter((p) => !['start/thanks', 'blog'].includes(p.page.id.split('/pages/')[1]));
  const body = [`# ${org.name}: full site`, '', `Generated from ${siteUrl}. Each section below is one page; its canonical URL is in the first line.`, '', ...pages.map((p) => p.markdown + '\n')].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
