import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkContact, handleContact, type ContactEnv } from './contact.ts';

const good = { name: 'Anna', email: 'Anna@Example.com', topic: 'seating', message: 'Can you draw our 300-seat venue?', lang: 'ru', page: '/pricing', turnstile_token: 'tok' };
const env: ContactEnv = { TURNSTILE_SECRET_KEY: 's', CONTACT_WEBHOOK_URL: 'https://n8n.example/webhook/x', CONTACT_WEBHOOK_TOKEN: 't' };
const post = (body: unknown) => new Request('https://arenasoldout.com/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify(body) });

test('checkContact keeps the inquiry fields and normalizes them', () => {
  const c = checkContact(good);
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.deepEqual(c.inquiry, { name: 'Anna', email: 'anna@example.com', topic: 'seating', message: good.message, lang: 'ru', page: '/pricing' });
});

test('checkContact falls back to safe topic, language and page', () => {
  const c = checkContact({ ...good, topic: 'hack', lang: 'xx', page: '//evil.example' });
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.equal(c.inquiry.topic, 'other');
  assert.equal(c.inquiry.lang, 'en');
  assert.equal(c.inquiry.page, '/');
});

test('checkContact rejects missing fields and flags the honeypot', () => {
  const bad = checkContact({ name: '', email: 'nope', message: 'short' });
  assert.deepEqual(bad, { ok: false, error: 'invalid', fields: ['name', 'email', 'message'] });
  assert.deepEqual(checkContact({ ...good, website: 'http://spam' }), { ok: false, error: 'spam' });
});

test('handleContact answers 503 without secrets', async () => {
  const r = await handleContact(post(good), {});
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: 'unavailable' });
});

test('handleContact verifies Turnstile, then forwards to n8n with the token header', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('siteverify')) return new Response(JSON.stringify({ success: true }));
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  const r = await handleContact(post(good), env, fetcher);
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, env.CONTACT_WEBHOOK_URL);
  assert.equal((calls[1].init?.headers as Record<string, string>)['X-Arena-Site-Token'], 't');
  const sent = JSON.parse(String(calls[1].init?.body));
  assert.equal(sent.topic, 'seating');
  assert.equal(sent.lang, 'ru');
  assert.ok(sent.received_at);
});

test('handleContact stops on a failed Turnstile and never calls n8n', async () => {
  let n8n = 0;
  const fetcher = (async (url: string) => {
    if (url.includes('siteverify')) return new Response(JSON.stringify({ success: false }));
    n8n++;
    return new Response('{}');
  }) as unknown as typeof fetch;
  const r = await handleContact(post(good), env, fetcher);
  assert.equal(r.status, 403);
  assert.equal(n8n, 0);
});

test('handleContact answers the honeypot like a success without any call', async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response('{}'); }) as unknown as typeof fetch;
  const r = await handleContact(post({ ...good, website: 'x' }), env, fetcher);
  assert.equal(r.status, 200);
  assert.equal(calls, 0);
});

test('handleContact respects the rate limit binding', async () => {
  const r = await handleContact(post(good), { ...env, CONTACT_LIMIT: { limit: async () => ({ success: false }) } });
  assert.equal(r.status, 429);
});
