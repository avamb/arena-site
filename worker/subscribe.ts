/**
 * POST /api/subscribe, /api/subscribe/confirm, /api/subscribe/unsubscribe: the e-mail subscription of the
 * warm list (popup and footer form). Subscribe checks the address and the honeypot, verifies Turnstile with
 * the secret of the site's forms widget, generates the confirmation token HERE (Web Crypto, so n8n needs no
 * random source) and hands everything to the n8n webhook "Arena site: subscribe", which finds or creates the
 * person in Twenty (status PENDING) and sends the confirmation letter. Confirm and unsubscribe carry only
 * the token (32 hex characters, a bearer secret) and are rate limited instead of Turnstile-checked.
 * Nothing is stored here.
 * Secrets (wrangler secret put): TURNSTILE_SECRET_KEY (shared with /api/contact), SUBSCRIBE_WEBHOOK_URL,
 * SUBSCRIBE_WEBHOOK_TOKEN. Without them the endpoints answer 503 `unavailable`.
 */

export const SUBSCRIBE_LANGS = ['en', 'es', 'cs', 'ru', 'no', 'he', 'uk', 'de', 'fr', 'it', 'pl', 'pt'] as const;
export const SUBSCRIBE_SOURCES = ['popup', 'footer'] as const;

export type SubscribeEnv = {
  TURNSTILE_SECRET_KEY?: string;
  SUBSCRIBE_WEBHOOK_URL?: string;
  SUBSCRIBE_WEBHOOK_TOKEN?: string;
  /** Workers rate limiting binding (wrangler.toml [[ratelimits]]); absent in tests and on nginx. */
  SUBSCRIBE_LIMIT?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
};

export type Subscription = {
  email: string; lang: string; source: string; page: string; consent: string;
  utm: Record<string, string>; cid: string;
};
export type Checked = { ok: true; subscription: Subscription; token: string } | { ok: false; error: 'invalid' | 'spam' };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const CID = /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const CONSENT = /^\d{4}-\d{2}-\d{2}$/;
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

/** Pure validation of the posted JSON; exported for the unit test. */
export function checkSubscribe(body: unknown): Checked {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (str(b.website, 200)) return { ok: false, error: 'spam' };
  const email = str(b.email, 200).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: 'invalid' };
  const lang = (SUBSCRIBE_LANGS as readonly string[]).includes(String(b.lang)) ? String(b.lang) : 'en';
  const source = (SUBSCRIBE_SOURCES as readonly string[]).includes(String(b.source)) ? String(b.source) : 'footer';
  const rawPage = str(b.page, 300);
  const page = rawPage.startsWith('/') && !rawPage.startsWith('//') ? rawPage : '/';
  const consent = CONSENT.test(str(b.consent, 20)) ? str(b.consent, 20) : '';
  const rawUtm = (b.utm && typeof b.utm === 'object' ? b.utm : {}) as Record<string, unknown>;
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) { const v = str(rawUtm[k], 100); if (v) utm[k] = v; }
  const cid = CID.test(str(b.cid, 20)) ? str(b.cid, 20) : '';
  return { ok: true, subscription: { email, lang, source, page, consent, utm, cid }, token: str(b.turnstile_token, 2048) };
}

/** 32 hex characters from Web Crypto: the bearer secret of the confirmation and unsubscribe links. */
export function newToken(random: (b: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  return Array.from(random(new Uint8Array(16)), (x) => x.toString(16).padStart(2, '0')).join('');
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function toWebhook(env: SubscribeEnv, fetcher: typeof fetch, payload: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const res = await fetcher(env.SUBSCRIBE_WEBHOOK_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Arena-Site-Token': env.SUBSCRIBE_WEBHOOK_TOKEN as string },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body };
  } catch {
    return null;
  }
}

export async function handleSubscribe(request: Request, env: SubscribeEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!env.TURNSTILE_SECRET_KEY || !env.SUBSCRIBE_WEBHOOK_URL || !env.SUBSCRIBE_WEBHOOK_TOKEN) return json(503, { error: 'unavailable' });
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return json(415, { error: 'invalid' });
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (env.SUBSCRIBE_LIMIT && !(await env.SUBSCRIBE_LIMIT.limit({ key: ip || 'unknown' })).success) return json(429, { error: 'rate' });

  const raw = await request.text();
  if (raw.length > 8_000) return json(413, { error: 'invalid' });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'invalid' }); }
  const path = new URL(request.url).pathname.replace(/\/+$/, '');

  if (path === '/api/subscribe/confirm' || path === '/api/subscribe/unsubscribe') {
    const token = str((body as Record<string, unknown> | null)?.token, 64);
    if (!TOKEN.test(token)) return json(404, { error: 'token' });
    const r = await toWebhook(env, fetcher, { action: path.endsWith('confirm') ? 'confirm' : 'unsubscribe', token });
    if (!r) return json(503, { error: 'unavailable' });
    if (r.status === 404) return json(404, { error: 'token' });
    if (r.status === 410) return json(410, { error: 'expired' });
    if (r.status >= 400) return json(503, { error: 'unavailable' });
    return json(200, { ok: true, lang: typeof r.body.lang === 'string' ? r.body.lang : undefined });
  }
  if (path !== '/api/subscribe') return json(404, { error: 'not_found' });

  const c = checkSubscribe(body);
  // A filled honeypot gets the same answer as a real subscription, so bots learn nothing.
  if (!c.ok) return c.error === 'spam' ? json(200, { ok: true }) : json(400, { error: 'invalid' });

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', c.token);
  if (ip) form.append('remoteip', ip);
  try {
    const v = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const r = (await v.json()) as { success?: boolean };
    if (!r.success) return json(403, { error: 'turnstile' });
  } catch {
    return json(503, { error: 'unavailable' });
  }

  const r = await toWebhook(env, fetcher, {
    action: 'subscribe', ...c.subscription, token: newToken(), received_at: new Date().toISOString(), country: request.headers.get('CF-IPCountry') ?? '',
  });
  if (!r || r.status >= 400) return json(503, { error: 'unavailable' });
  return json(200, { ok: true });
}
