/**
 * POST /api/contact: the "Contact the team" form (doc 51 §1.3, doc 33 §3.4). Checks the fields and the
 * honeypot, verifies Turnstile with the secret of the site's forms widget, and hands the inquiry to the
 * n8n webhook, which stores it in Twenty (question, answer, topic, language, date: the future FAQ and the
 * site chat bot) and alerts the team in Telegram and by e-mail. Nothing is stored here.
 * Secrets (wrangler secret put): TURNSTILE_SECRET_KEY, CONTACT_WEBHOOK_URL, CONTACT_WEBHOOK_TOKEN.
 * Without them the endpoint answers 503 `unavailable` and the form points to Telegram and e-mail.
 */

export const CONTACT_TOPICS = ['start', 'pricing', 'seating', 'payments', 'integration', 'other'] as const;
export const CONTACT_LANGS = ['en', 'es', 'cs', 'ru', 'no', 'he'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactEnv = {
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_WEBHOOK_URL?: string;
  CONTACT_WEBHOOK_TOKEN?: string;
  /** Workers rate limiting binding (wrangler.toml [[ratelimits]]); absent in tests and on nginx. */
  CONTACT_LIMIT?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
};

export type Inquiry = { name: string; email: string; topic: ContactTopic; message: string; lang: string; page: string };
export type Checked = { ok: true; inquiry: Inquiry; token: string } | { ok: false; error: 'invalid' | 'spam'; fields?: string[] };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

/** Pure validation of the posted JSON; exported for the unit test. */
export function checkContact(body: unknown): Checked {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (str(b.website, 200)) return { ok: false, error: 'spam' };
  const name = str(b.name, 100);
  const email = str(b.email, 200).toLowerCase();
  const message = str(b.message, 4000);
  const topic = (CONTACT_TOPICS as readonly string[]).includes(String(b.topic)) ? (b.topic as ContactTopic) : 'other';
  const lang = (CONTACT_LANGS as readonly string[]).includes(String(b.lang)) ? String(b.lang) : 'en';
  const rawPage = str(b.page, 300);
  const page = rawPage.startsWith('/') && !rawPage.startsWith('//') ? rawPage : '/';
  const fields = [!name && 'name', !EMAIL.test(email) && 'email', message.length < 10 && 'message'].filter(Boolean) as string[];
  if (fields.length) return { ok: false, error: 'invalid', fields };
  return { ok: true, inquiry: { name, email, topic, message, lang, page }, token: str(b.turnstile_token, 2048) };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function handleContact(request: Request, env: ContactEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_WEBHOOK_URL || !env.CONTACT_WEBHOOK_TOKEN) return json(503, { error: 'unavailable' });
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return json(415, { error: 'invalid' });
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (env.CONTACT_LIMIT && !(await env.CONTACT_LIMIT.limit({ key: ip || 'unknown' })).success) return json(429, { error: 'rate' });

  const raw = await request.text();
  if (raw.length > 16_000) return json(413, { error: 'invalid' });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'invalid' }); }
  const c = checkContact(body);
  // A filled honeypot gets the same answer as a real message, so bots learn nothing.
  if (!c.ok) return c.error === 'spam' ? json(200, { ok: true }) : json(400, { error: 'invalid', fields: c.fields });

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

  try {
    const res = await fetcher(env.CONTACT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Arena-Site-Token': env.CONTACT_WEBHOOK_TOKEN },
      body: JSON.stringify({ ...c.inquiry, received_at: new Date().toISOString(), country: request.headers.get('CF-IPCountry') ?? '', source: 'site' }),
    });
    if (!res.ok) return json(502, { error: 'unavailable' });
  } catch {
    return json(502, { error: 'unavailable' });
  }
  return json(200, { ok: true });
}
