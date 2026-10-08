/**
 * Node entry for the container (ops/forms/Dockerfile): the same Hono app behind nginx, which
 * proxies /api/ here. Environment variable names are identical to the Worker secrets (.env.example).
 */
import { serve } from '@hono/node-server';
import { createApp, type Env } from './app';

const env: Env = {
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  FORMS_WEBHOOK_URL: process.env.FORMS_WEBHOOK_URL,
  FORMS_WEBHOOK_TOKEN: process.env.FORMS_WEBHOOK_TOKEN,
  SITE_URL: process.env.SITE_URL,
};

const app = createApp();
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: (req) => app.fetch(req, env), port, hostname: process.env.HOST ?? '0.0.0.0' }, (info) => {
  console.log(`arena-site forms listening on http://${info.address}:${info.port}`);
});
