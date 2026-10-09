/**
 * Form handler on Hono (doc 33 §3.4, §3.7a): web-standard Request/Response, so the same code runs
 * in a Cloudflare Worker (worker.ts) and in Node (server-node.ts). Thin by design: validate, check
 * Turnstile, forward to the n8n webhook, answer JSON (fetch) or redirect (plain form post).
 * No storage: applications live in n8n/Telegram/Brevo, never here.
 */
import { Hono } from 'hono';

export type Env = {
  TURNSTILE_SECRET_KEY?: string;
  FORMS_WEBHOOK_URL?: string;
  FORMS_WEBHOOK_TOKEN?: string;
  SITE_URL?: string;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
};

export type Deps = {
  fetch?: typeof fetch;
  now?: () => number;
};

const MAX_BODY = 16 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

export type Application = {
  organization: string;
  country: string;
  provider: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  lang: string;
};

const trim = (v: FormDataEntryValue | null | undefined, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validate(fd: FormData): { ok: true; data: Application } | { ok: false; errors: Record<string, string> } {
  const data: Application = {
    organization: trim(fd.get('organization'), 200),
    country: trim(fd.get('country'), 8),
    provider: trim(fd.get('provider'), 40),
    name: trim(fd.get('name'), 200),
    email: trim(fd.get('email'), 254),
    phone: trim(fd.get('phone'), 60),
    message: trim(fd.get('message'), 4000),
    lang: trim(fd.get('lang'), 5) || 'en',
  };
  const errors: Record<string, string> = {};
  for (const k of ['organization', 'country', 'name', 'email', 'phone'] as const) if (!data[k]) errors[k] = 'required';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'email';
  // A plausible phone number: optional +, 7 to 15 digits, separators allowed (E.164 length limits).
  const digits = data.phone.replace(/[^0-9]/g, '');
  if (data.phone && (!/^[+]?[0-9 ().-]+$/.test(data.phone) || digits.length < 7 || digits.length > 15)) errors.phone = 'phone';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

export async function verifyTurnstile(secret: string, token: string, ip: string | undefined, f: typeof fetch): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await f('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!res.ok) return false;
  const json = (await res.json()) as { success?: boolean };
  return json.success === true;
}

export function createApp(deps: Deps = {}) {
  const f = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const hits = new Map<string, number[]>(); // per isolate / process; good enough for a contact form

  const app = new Hono<{ Bindings: Env }>();

  app.get('/api/health', (c) => c.json({ ok: true, service: 'arena-site-forms' }));

  app.post('/api/forms/start', async (c) => {
    const wantsJson = (c.req.header('accept') ?? '').includes('application/json');
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
    const origin = c.env?.SITE_URL;
    const answer = (status: number, payload: Record<string, unknown>, redirect?: string) => {
      if (wantsJson || !redirect) return c.json(payload, status as 200);
      return c.redirect(redirect, 303);
    };

    const len = Number(c.req.header('content-length') ?? 0);
    if (len > MAX_BODY) return answer(413, { ok: false, error: 'too_large' });

    let fd: FormData;
    try { fd = await c.req.formData(); } catch { return answer(400, { ok: false, error: 'bad_request' }); }

    const redirectTo = (() => { const r = trim(fd.get('redirect'), 200); return r.startsWith('/') && !r.startsWith('//') ? r : '/start/thanks'; })();
    const failTo = (() => { const base = trim(fd.get('lang'), 5); return base && base !== 'en' ? `/${base}/start?error=1` : '/start?error=1'; })();

    // Honeypot: bots fill "website"; pretend success, forward nothing.
    if (trim(fd.get('website'))) return answer(200, { ok: true, redirect: redirectTo }, redirectTo);

    // Rate limit per IP, in memory.
    const t = now();
    const recent = (hits.get(ip) ?? []).filter((x) => t - x < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) return answer(429, { ok: false, error: 'rate_limited' }, failTo);
    recent.push(t);
    hits.set(ip, recent);

    const v = validate(fd);
    if (!v.ok) return answer(422, { ok: false, error: 'validation', fields: v.errors }, failTo);

    const secret = c.env?.TURNSTILE_SECRET_KEY;
    if (secret) {
      const token = trim(fd.get('cf-turnstile-response'), 4000);
      const passed = token ? await verifyTurnstile(secret, token, ip === 'local' ? undefined : ip, f) : false;
      if (!passed) return answer(403, { ok: false, error: 'turnstile' }, failTo);
    }

    const webhook = c.env?.FORMS_WEBHOOK_URL;
    const payload = { form: 'start', received_at: new Date(t).toISOString(), origin, ...v.data, user_agent: c.req.header('user-agent') ?? '' };
    if (webhook) {
      try {
        const res = await f(webhook, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(c.env?.FORMS_WEBHOOK_TOKEN ? { authorization: `Bearer ${c.env.FORMS_WEBHOOK_TOKEN}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return answer(502, { ok: false, error: 'webhook' }, failTo);
      } catch {
        return answer(502, { ok: false, error: 'webhook' }, failTo);
      }
    } else {
      console.log('forms: FORMS_WEBHOOK_URL not set, application accepted without forwarding', { organization: v.data.organization, country: v.data.country });
    }
    return answer(200, { ok: true, redirect: redirectTo }, redirectTo);
  });

  return app;
}
