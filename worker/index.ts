/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Worker entry: answers the www./new. -> apex redirects (wrangler.toml run_worker_first),
 * everything else is served by Workers Static Assets from dist/. No form handler: the application form
 * talks to the platform API from the browser (doc 34 §9). No KV, D1, R2 or Durable Objects (doc 33 §3.7a).
 */
type Env = { SITE_URL?: string; ASSETS?: { fetch: (req: Request) => Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Launch: www. and the development host new. answer 301 to the apex, path and query kept.
    const site = env.SITE_URL;
    if (site && new URL(site).hostname === 'arenasoldout.com' && (url.hostname === 'www.arenasoldout.com' || url.hostname === 'new.arenasoldout.com')) {
      return Response.redirect(`${site}${url.pathname}${url.search}`, 301);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
