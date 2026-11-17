// Subscription call from arenasoldout.com (worker/subscribe.ts in avamb/arena-site: Turnstile, the honeypot and the
// field checks are already done there; the Worker also generated the token). Checked again here, because the
// webhook is a public URL guarded only by a shared header.
const b = ($input.first().json.body) || {};
const cut = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const bad = (action) => [{ json: { route: 'bad', action } }];
const HEX32 = /^[0-9a-f]{32}$/;
const action = ['subscribe', 'confirm', 'unsubscribe'].includes(b.action) ? b.action : '';
if (!action) return bad('');
const token = cut(b.token, 64);
if (!HEX32.test(token)) return bad(action);
if (action !== 'subscribe') return [{ json: { route: 'token', action, token } }];

// No quote or backslash in an address: it goes into a Twenty filter string.
const email = cut(b.email, 200).toLowerCase();
if (!/^[^\s@"\\]{1,64}@[^\s@"\\]{1,190}\.[^\s@"\\]{2,}$/.test(email)) return bad(action);
const LANGS = ['en', 'es', 'cs', 'ru', 'no', 'he', 'uk', 'de', 'fr', 'it', 'pl', 'pt'];
const utm = {};
for (const k of ['source', 'medium', 'campaign', 'term', 'content']) { const v = cut((b.utm || {})[k], 100); if (v) utm[k] = v; }
const cid = /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/.test(cut(b.cid, 20)) ? cut(b.cid, 20) : '';
const page = cut(b.page, 300);
return [{
  json: {
    route: 'subscribe', action, token, email, utm, cid,
    lang: LANGS.includes(b.lang) ? b.lang : 'en',
    source: b.source === 'popup' ? 'popup' : 'footer',
    page: page.startsWith('/') && !page.startsWith('//') ? page : '/',
    consent: /^\d{4}-\d{2}-\d{2}$/.test(cut(b.consent, 20)) ? cut(b.consent, 20) : '',
    receivedAt: cut(b.received_at, 40) || new Date().toISOString(),
    country: cut(b.country, 2),
  },
}];
