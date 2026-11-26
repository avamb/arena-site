/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Worker entry: answers the www./new. -> apex redirects (wrangler.toml run_worker_first) and
 * POST /api/contact, the "Contact the team" form (worker/contact.ts); everything else is served by Workers
 * Static Assets from dist/. The application form talks to the platform API from the browser (doc 34 §9).
 * No KV, D1, R2 or Durable Objects (doc 33 §3.7a).
 */
import { handleContact, type ContactEnv } from './contact';
import { handleSubscribe, type SubscribeEnv } from './subscribe';

type Env = ContactEnv & SubscribeEnv & { SITE_URL?: string; ASSETS?: { fetch: (req: Request) => Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Launch: www. and the development host new. answer 301 to the apex, path and query kept.
    const site = env.SITE_URL;
    if (site && new URL(site).hostname === 'arenasoldout.com' && (url.hostname === 'www.arenasoldout.com' || url.hostname === 'new.arenasoldout.com')) {
      return Response.redirect(`${site}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (url.pathname === '/api/subscribe' || url.pathname.startsWith('/api/subscribe/')) return handleSubscribe(request, env);
    if (env.ASSETS) return permanent(await env.ASSETS.fetch(request));
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Static Assets answer `/pricing/` -> `/pricing` and `/index.html` -> `/` (html_handling) with a 307. These
 * addresses move for good, so search engines get a 301 and pass the old address's signals to the new one.
 * Redirects from redirects.yaml carry their own code (301 by default) and are left as they are.
 */
export function permanent(res: Response): Response {
  if (res.status !== 307 || !res.headers.get('Location')) return res;
  return new Response(null, { status: 301, headers: res.headers });
}
