import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { permanent } from './index.ts';

const assets = (res: () => Response) => ({ fetch: async () => res() });

test('a 307 from Static Assets (trailing slash, index.html) becomes a 301 with the same Location', async () => {
  const env = { SITE_URL: 'https://arenasoldout.com', ASSETS: assets(() => new Response(null, { status: 307, headers: { Location: '/pricing' } })) };
  const res = await worker.fetch(new Request('https://arenasoldout.com/pricing/'), env as never);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), '/pricing');
});

test('pages, 404s and 301 redirects pass through unchanged', () => {
  const ok = new Response('x', { status: 200 });
  assert.equal(permanent(ok), ok);
  const gone = new Response('x', { status: 404 });
  assert.equal(permanent(gone), gone);
  const moved = new Response(null, { status: 301, headers: { Location: '/pricing' } });
  assert.equal(permanent(moved), moved);
});

test('www. still answers 301 to the apex before Static Assets', async () => {
  const env = { SITE_URL: 'https://arenasoldout.com', ASSETS: assets(() => new Response('page')) };
  const res = await worker.fetch(new Request('https://www.arenasoldout.com/pricing?x=1'), env as never);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://arenasoldout.com/pricing?x=1');
});
