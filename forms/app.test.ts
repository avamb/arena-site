/** One test set for both entry points (doc 33 §3.7a): the app is exercised through fetch semantics only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const valid = { organization: 'Test Theatre', country: 'CZ', provider: 'stripe', name: 'Jana', email: 'jana@example.com', phone: '+420 000 000', message: 'Two shows in May', lang: 'en', redirect: '/start/thanks' };
const post = (app: ReturnType<typeof createApp>, fd: FormData, env: Record<string, string> = {}, headers: Record<string, string> = { accept: 'application/json' }) =>
  app.fetch(new Request('http://localhost/api/forms/start', { method: 'POST', body: fd, headers }), env);

test('health', async () => {
  const res = await createApp().fetch(new Request('http://localhost/api/health'), {});
  assert.equal(res.status, 200);
});

test('accepts a valid application and forwards it to the webhook', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  const res = await post(createApp({ fetch: fakeFetch }), form(valid), { FORMS_WEBHOOK_URL: 'https://n8n.example/webhook/start' });
  assert.equal(res.status, 200);
  const json = (await res.json()) as { ok: boolean; redirect: string };
  assert.equal(json.ok, true);
  assert.equal(json.redirect, '/start/thanks');
  assert.equal(calls.length, 1);
  assert.equal((calls[0].body as { organization: string }).organization, 'Test Theatre');
});

test('redirects plain form posts (no JS)', async () => {
  const res = await post(createApp(), form(valid), {}, {});
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/start/thanks');
});

test('rejects missing fields with 422 and names them', async () => {
  const res = await post(createApp(), form({ ...valid, email: '', organization: '' }));
  assert.equal(res.status, 422);
  const json = (await res.json()) as { fields: Record<string, string> };
  assert.deepEqual(Object.keys(json.fields).sort(), ['email', 'organization']);
});

test('rejects a bad e-mail', async () => {
  const res = await post(createApp(), form({ ...valid, email: 'not-an-email' }));
  assert.equal(res.status, 422);
});

test('honeypot: pretends success, forwards nothing', async () => {
  let called = 0;
  const fakeFetch = (async () => { called++; return new Response('{}'); }) as unknown as typeof fetch;
  const res = await post(createApp({ fetch: fakeFetch }), form({ ...valid, website: 'http://spam' }), { FORMS_WEBHOOK_URL: 'https://n8n.example/x' });
  assert.equal(res.status, 200);
  assert.equal(called, 0);
});

test('turnstile: fails closed when the secret is set and the token is missing or invalid', async () => {
  const fakeFetch = (async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as unknown as typeof fetch;
  const res = await post(createApp({ fetch: fakeFetch }), form({ ...valid, 'cf-turnstile-response': 'x' }), { TURNSTILE_SECRET_KEY: 'secret' });
  assert.equal(res.status, 403);
  const json = (await res.json()) as { error: string };
  assert.equal(json.error, 'turnstile');
});

test('rate limit: sixth submission from one IP within the window is refused', async () => {
  let t = 0;
  const app = createApp({ now: () => t });
  for (let i = 0; i < 5; i++) { t += 1000; assert.equal((await post(app, form(valid))).status, 200); }
  t += 1000;
  assert.equal((await post(app, form(valid))).status, 429);
});

test('webhook failure is reported, not swallowed', async () => {
  const fakeFetch = (async () => new Response('down', { status: 500 })) as unknown as typeof fetch;
  const res = await post(createApp({ fetch: fakeFetch }), form(valid), { FORMS_WEBHOOK_URL: 'https://n8n.example/x' });
  assert.equal(res.status, 502);
});
