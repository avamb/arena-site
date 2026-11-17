import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubscribe, handleSubscribe, newToken, type SubscribeEnv } from './subscribe.ts';

const good = { email: 'Anna@Example.com', lang: 'ru', source: 'popup', page: '/ru/pricing', consent: '2026-11-17', utm: { source: 'fb', medium: 'x'.repeat(300), junk: 'no' }, cid: 'abcdefghjk', turnstile_token: 'tok' };
const env: SubscribeEnv = { TURNSTILE_SECRET_KEY: 's', SUBSCRIBE_WEBHOOK_URL: 'https://n8n.example/webhook/x', SUBSCRIBE_WEBHOOK_TOKEN: 't' };
const post = (body: unknown, path = '/api/subscribe') => new Request(`https://arenasoldout.com${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify(body) });

type Call = { url: string; init?: RequestInit };
function stub(answers: { turnstile?: boolean; hook?: { status: number; body?: unknown } | 'throw' } = {}) {
  const calls: Call[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: answers.turnstile !== false }));
    if (answers.hook === 'throw') throw new Error('down');
    const h = answers.hook ?? { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(h.body ?? {}), { status: h.status });
  }) as unknown as typeof fetch;
  return { f, calls };
}

test('checkSubscribe normalizes the address, keeps known utm keys and a valid cid', () => {
  const c = checkSubscribe(good);
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.equal(c.subscription.email, 'anna@example.com');
  assert.equal(c.subscription.lang, 'ru');
  assert.equal(c.subscription.source, 'popup');
  assert.equal(c.subscription.cid, 'abcdefghjk');
  assert.deepEqual(Object.keys(c.subscription.utm), ['source', 'medium']);
  assert.equal(c.subscription.utm.medium.length, 100);
});

test('checkSubscribe falls back to safe language, source, page, cid and consent', () => {
  const c = checkSubscribe({ ...good, lang: 'xx', source: 'hack', page: '//evil.example', cid: 'not a code', consent: 'yes' });
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.deepEqual([c.subscription.lang, c.subscription.source, c.subscription.page, c.subscription.cid, c.subscription.consent], ['en', 'footer', '/', '', '']);
});

test('checkSubscribe rejects a bad address and flags the honeypot', () => {
  assert.deepEqual(checkSubscribe({ ...good, email: 'nope' }), { ok: false, error: 'invalid' });
  assert.deepEqual(checkSubscribe({ ...good, website: 'http://spam' }), { ok: false, error: 'spam' });
});

test('newToken is 32 hex characters and differs between calls', () => {
  assert.match(newToken(), /^[0-9a-f]{32}$/);
  assert.notEqual(newToken(), newToken());
});

test('subscribe: verifies Turnstile, then posts action=subscribe with a generated token and the shared secret header', async () => {
  const { f, calls } = stub();
  const res = await handleSubscribe(post(good), env, f);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.ok(calls[0].url.includes('turnstile'));
  const hook = calls[1];
  assert.equal(hook.url, env.SUBSCRIBE_WEBHOOK_URL);
  assert.equal((hook.init?.headers as Record<string, string>)['X-Arena-Site-Token'], 't');
  const sent = JSON.parse(String(hook.init?.body));
  assert.equal(sent.action, 'subscribe');
  assert.equal(sent.email, 'anna@example.com');
  assert.match(sent.token, /^[0-9a-f]{32}$/);
  assert.equal(sent.cid, 'abcdefghjk');
  assert.ok(!('turnstile_token' in sent));
});

test('subscribe: a failed Turnstile check answers 403 and never reaches n8n', async () => {
  const { f, calls } = stub({ turnstile: false });
  const res = await handleSubscribe(post(good), env, f);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
});

test('subscribe: honeypot looks like success but sends nothing', async () => {
  const { f, calls } = stub();
  const res = await handleSubscribe(post({ ...good, website: 'x' }), env, f);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('subscribe: 503 without secrets, 400 for a bad address, 503 when n8n is down or refuses', async () => {
  assert.equal((await handleSubscribe(post(good), {}, stub().f)).status, 503);
  assert.equal((await handleSubscribe(post({ ...good, email: 'x' }), env, stub().f)).status, 400);
  assert.equal((await handleSubscribe(post(good), env, stub({ hook: 'throw' }).f)).status, 503);
  assert.equal((await handleSubscribe(post(good), env, stub({ hook: { status: 500 } }).f)).status, 503);
});

test('subscribe: the rate limit answers 429', async () => {
  const limited: SubscribeEnv = { ...env, SUBSCRIBE_LIMIT: { limit: async () => ({ success: false }) } };
  assert.equal((await handleSubscribe(post(good), limited, stub().f)).status, 429);
});

test('confirm and unsubscribe pass only a well-formed token and map n8n answers', async () => {
  const token = 'a'.repeat(32);
  const ok = stub({ hook: { status: 200, body: { ok: true, lang: 'de' } } });
  const res = await handleSubscribe(post({ token }, '/api/subscribe/confirm'), env, ok.f);
  assert.deepEqual(await res.json(), { ok: true, lang: 'de' });
  assert.equal(JSON.parse(String(ok.calls[0].init?.body)).action, 'confirm');
  const un = stub();
  await handleSubscribe(post({ token }, '/api/subscribe/unsubscribe'), env, un.f);
  assert.equal(JSON.parse(String(un.calls[0].init?.body)).action, 'unsubscribe');

  const bad = stub();
  assert.equal((await handleSubscribe(post({ token: 'short' }, '/api/subscribe/confirm'), env, bad.f)).status, 404);
  assert.equal(bad.calls.length, 0);
  assert.equal((await handleSubscribe(post({ token }, '/api/subscribe/confirm'), env, stub({ hook: { status: 404 } }).f)).status, 404);
  const gone = await handleSubscribe(post({ token }, '/api/subscribe/confirm'), env, stub({ hook: { status: 410 } }).f);
  assert.equal(gone.status, 410);
  assert.deepEqual(await gone.json(), { error: 'expired' });
});

test('only POST is accepted', async () => {
  const res = await handleSubscribe(new Request('https://arenasoldout.com/api/subscribe'), env, stub().f);
  assert.equal(res.status, 405);
});
