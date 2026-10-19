/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Worker entry: /api/* goes to the Hono app (wrangler.toml run_worker_first), everything
 * else is served by Workers Static Assets from dist/. No KV, D1, R2 or Durable Objects (doc 33 §3.7a).
 */
import { createApp, type Env } from './app';

const app = createApp();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // Launch: www. and the development host new. answer 301 to the apex, path and query kept.
    const site = (env as unknown as { SITE_URL?: string }).SITE_URL;
    if (site && new URL(site).hostname === 'arenasoldout.com' && (url.hostname === 'www.arenasoldout.com' || url.hostname === 'new.arenasoldout.com')) {
      return Response.redirect(`${site}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
