/**
 * robots.txt (doc 33 §3.10, item 9). Agents are explicitly allowed. While `indexing` is false
 * (the new. subdomain), everything is disallowed; flip the flag in site.config.ts on launch day.
 */
import type { APIRoute } from 'astro';
import { indexing, allowedAgents, siteUrl } from '@config';

export const GET: APIRoute = () => {
  const lines: string[] = [];
  if (!indexing) {
    lines.push('# Development host: not for indexing until launch day (site.config.ts: indexing)', 'User-agent: *', 'Disallow: /', '');
  } else {
    for (const ua of allowedAgents) lines.push(`User-agent: ${ua}`, 'Allow: /', '');
    lines.push('User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /_states/', '', `Sitemap: ${siteUrl}/sitemap-index.xml`, '');
  }
  // Keep the agent list visible even on the dev host so the CI check and a human can read it.
  if (!indexing) lines.push(`# Allowed on launch: ${allowedAgents.join(', ')}`, '');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
