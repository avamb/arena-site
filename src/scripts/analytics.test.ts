import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AID_COOKIE, AID_MAX_AGE, CONSENT_COOKIE, CONSENT_MAX_AGE, consentedAid, cookieLine, createAnalytics, newAid, parseCookies, readChoice, readCid, withoutCid,
} from './analytics.ts';
import { trackAction, trackLabel } from '../lib/track.ts';

/** A browser stand-in: cookie jar with Max-Age, an address bar, a request log, the events the tracker listens to. */
function browser(opts: { url?: string; cookie?: string; referrer?: string; endpoint?: string } = {}) {
  const jar = new Map<string, string>();
  for (const part of (opts.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  const location = new URL(opts.url ?? 'https://arenasoldout.com/pricing');
  const requests: { url: string; body: { aid?: string; cid?: string; pv: string; events: { name: string; props: Record<string, unknown> }[] } }[] = [];
  const cookieWrites: string[] = [];
  const history = { state: null as unknown, replaced: [] as string[], replaceState(_s: unknown, _t: string, url: string) { this.replaced.push(url); location.href = new URL(url, location.href).href; } };
  const doc = Object.defineProperties(Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    referrer: opts.referrer ?? '',
    title: 'Pricing',
    documentElement: { lang: 'en', scrollHeight: 4000 },
  }), Object.getOwnPropertyDescriptors({
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(line: string) {
      cookieWrites.push(line);
      const [pair, ...attrs] = line.split(';').map((x) => x.trim());
      const i = pair.indexOf('=');
      const name = pair.slice(0, i), value = pair.slice(i + 1);
      const maxAge = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
      if (maxAge !== undefined && Number(maxAge.split('=')[1]) <= 0) jar.delete(name);
      else jar.set(name, value);
    },
  }));
  const win = Object.assign(new EventTarget(), {
    document: doc,
    location,
    history,
    navigator: {},
    crypto: globalThis.crypto,
    scrollY: 0,
    innerHeight: 800,
    setInterval: () => 0,
    clearInterval: () => undefined,
    fetch: async (url: string, init: { body: string }) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return new Response(null, { status: 204 });
    },
  });
  const endpoint = opts.endpoint ?? 'https://api.example.test/v1/t';
  return { win: win as unknown as Window, jar, requests, cookieWrites, history, location, endpoint, doc, rawWin: win };
}

/** A click on a key button (the tracker looks for the closest element with data-track). */
function clickOn(doc: EventTarget, label = 'apply.hero') {
  const ev = new Event('click');
  Object.defineProperty(ev, 'target', { value: { closest: () => ({ getAttribute: () => label }) } });
  doc.dispatchEvent(ev);
}

const CID = 'x7k2qpm3ab';
const names = (b: ReturnType<typeof browser>) => b.requests.flatMap((r) => r.body.events.map((e) => e.name));

test('cookie helpers: lifetimes, attributes, parsing', () => {
  assert.equal(CONSENT_MAX_AGE, 183 * 86400);
  assert.equal(AID_MAX_AGE, 395 * 86400);
  assert.equal(cookieLine('aso_aid', 'x', AID_MAX_AGE, true), 'aso_aid=x; Path=/; Max-Age=34128000; SameSite=Lax; Secure');
  assert.ok(!cookieLine('a', 'b', 1, false).includes('Secure'));
  assert.deepEqual(parseCookies('a=1; aso_consent=0;b = 2'), { a: '1', aso_consent: '0', b: '2' });
  assert.equal(readChoice('aso_consent=1'), 'granted');
  assert.equal(readChoice('aso_consent=0'), 'denied');
  assert.equal(readChoice('aso_consent=maybe'), null);
  assert.equal(readChoice(''), null);
});

test('cid: only the 10-character alphabet is read, and it is cut out of the address', () => {
  assert.equal(readCid(`?cid=${CID}&utm_source=mail`), CID);
  assert.equal(readCid('?cid=short'), null);
  assert.equal(readCid('?cid=ILLEGAL0Ol'), null);
  assert.equal(readCid('?cid=x7k2qpm3ab0'), null);
  assert.equal(withoutCid('/pricing', `?utm_source=mail&cid=${CID}&x=1`, '#plans'), '/pricing?utm_source=mail&x=1#plans');
  assert.equal(withoutCid('/pricing', `?cid=${CID}`, ''), '/pricing');
  assert.equal(withoutCid('/pricing', '?cid=bad', ''), '/pricing');
  assert.equal(withoutCid('/pricing', '?x=1', ''), null);
});

test('newAid: right shape and not repeated', () => {
  const a = newAid((n) => crypto.getRandomValues(new Uint8Array(n)));
  const b = newAid((n) => crypto.getRandomValues(new Uint8Array(n)));
  assert.match(a, /^a_[A-Za-z0-9_-]{24}$/);
  assert.notEqual(a, b);
});

test('consentedAid: only with the consent cookie', () => {
  assert.equal(consentedAid(`aso_consent=1; ${AID_COOKIE}=a_abcdefghij`), 'a_abcdefghij');
  assert.equal(consentedAid(`aso_consent=0; ${AID_COOKIE}=a_abcdefghij`), null);
  assert.equal(consentedAid(`${AID_COOKIE}=a_abcdefghij`), null);
  assert.equal(consentedAid(`aso_consent=1; ${AID_COOKIE}=bad value!`), null);
});

test('empty endpoint: nothing is sent, no cookie is written, the address is still cleaned', () => {
  const b = browser({ url: `https://arenasoldout.com/pricing?cid=${CID}`, endpoint: '' });
  const a = createAnalytics({ win: b.win, endpoint: '' });
  assert.equal(a.active(), false);
  a.start();
  a.accept();
  a.decline();
  assert.equal(b.requests.length, 0);
  assert.equal(b.cookieWrites.length, 0);
});

test('before a choice nothing leaves the browser, however the visitor behaves', async () => {
  const b = browser();
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  clickOn(b.doc);
  b.rawWin.dispatchEvent(new Event('scroll'));
  b.rawWin.dispatchEvent(new Event('pagehide'));
  b.doc.visibilityState = 'hidden';
  b.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(a.choice(), null);
  assert.equal(b.requests.length, 0);
  assert.equal(b.cookieWrites.length, 0);
});

test('the e-mail click: one batch with cid and no aid, even without consent, then silence', () => {
  const b = browser({ url: `https://arenasoldout.com/pricing?utm_source=mail&cid=${CID}`, referrer: 'https://mail.example.com/x' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].body.cid, CID);
  assert.equal(b.requests[0].body.aid, undefined);
  assert.deepEqual(b.requests[0].body.events.map((e) => e.name), ['page_view']);
  assert.deepEqual(b.requests[0].body.events[0].props, { path: '/pricing', title: 'Pricing', lang: 'en', ref_host: 'mail.example.com', utm_source: 'mail' });
  assert.deepEqual(b.history.replaced, ['/pricing?utm_source=mail']);
  assert.equal(b.location.search, '?utm_source=mail');
  assert.equal(b.cookieWrites.length, 0);
  // Later activity stays local.
  clickOn(b.doc);
  b.rawWin.dispatchEvent(new Event('pagehide'));
  assert.equal(b.requests.length, 1);
});

test('a malformed cid is stripped from the address and never sent', () => {
  const b = browser({ url: 'https://arenasoldout.com/pricing?cid=nope' });
  createAnalytics({ win: b.win, endpoint: b.endpoint }).start();
  assert.equal(b.requests.length, 0);
  assert.deepEqual(b.history.replaced, ['/pricing']);
});

test('accept: consent cookie, aid cookie, then page_view and consent with the aid', () => {
  const b = browser();
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.accept();
  assert.equal(a.choice(), 'granted');
  assert.equal(b.jar.get(CONSENT_COOKIE), '1');
  const aid = b.jar.get(AID_COOKIE);
  assert.match(aid ?? '', /^a_[A-Za-z0-9_-]{24}$/);
  const writes = b.cookieWrites.join('\n');
  assert.match(writes, /aso_aid=a_[\w-]+; Path=\/; Max-Age=34128000; SameSite=Lax; Secure/);
  assert.match(writes, /aso_consent=1; Path=\/; Max-Age=15811200; SameSite=Lax; Secure/);
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].body.aid, aid);
  assert.deepEqual(names(b), ['page_view', 'consent']);
  assert.deepEqual(b.requests[0].body.events[1].props, { analytics: true });
});

test('a remembered consent: the page is reported with the stored aid, an existing cookie is not renewed', () => {
  const b = browser({ cookie: 'aso_consent=1; aso_aid=a_storedvisitor1' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  b.rawWin.dispatchEvent(new Event('pagehide'));
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].body.aid, 'a_storedvisitor1');
  assert.deepEqual(names(b), ['page_view']);
  assert.ok(!b.cookieWrites.some((w) => w.startsWith('aso_aid=')));
});

test('a remembered consent with an e-mail link: cid and aid travel together in the first batch only', () => {
  const b = browser({ url: `https://arenasoldout.com/?cid=${CID}`, cookie: 'aso_consent=1; aso_aid=a_storedvisitor1' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.accept(); // already granted: no effect
  clickOn(b.doc);
  b.rawWin.dispatchEvent(new Event('pagehide'));
  assert.equal(b.requests[0].body.cid, CID);
  assert.equal(b.requests[0].body.aid, 'a_storedvisitor1');
  for (const r of b.requests.slice(1)) assert.equal(r.body.cid, undefined);
});

test('decline: the aid cookie goes, the consent event carries no aid, nothing follows', () => {
  const b = browser({ cookie: 'aso_consent=1; aso_aid=a_storedvisitor1' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.decline();
  assert.equal(a.choice(), 'denied');
  assert.equal(b.jar.has(AID_COOKIE), false);
  assert.equal(b.jar.get(CONSENT_COOKIE), '0');
  // What was collected under the consent leaves first, with its id. The choice itself leaves without one.
  assert.equal(b.requests.length, 2);
  assert.equal(b.requests[0].body.aid, 'a_storedvisitor1');
  assert.deepEqual(names(b), ['page_view', 'consent']);
  assert.deepEqual(b.requests[1].body.events[0].props, { analytics: false });
  assert.equal(b.requests[1].body.aid, undefined);
  b.requests.length = 0;
  clickOn(b.doc);
  b.rawWin.dispatchEvent(new Event('pagehide'));
  b.doc.visibilityState = 'hidden';
  b.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(b.requests.length, 0);
});

test('a first-time decline records only the choice, with no aid and no cookie of the visitor', () => {
  const b = browser();
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.decline();
  assert.equal(b.jar.has(AID_COOKIE), false);
  assert.equal(b.jar.get(CONSENT_COOKIE), '0');
  assert.deepEqual(names(b), ['consent']);
  assert.equal(b.requests[0].body.aid, undefined);
  assert.equal(b.requests.length, 1);
});

test('a click on a marked button is reported only while analytics is granted', () => {
  const on = browser({ cookie: 'aso_consent=1; aso_aid=a_storedvisitor1' });
  const a = createAnalytics({ win: on.win, endpoint: on.endpoint });
  a.start();
  clickOn(on.doc, 'apply.header');
  a.accept();
  on.rawWin.dispatchEvent(new Event('pagehide'));
  const clicks = on.requests.flatMap((r) => r.body.events).filter((e) => e.name === 'click');
  assert.deepEqual(clicks.map((e) => e.props.name), ['apply.header']);
});

test('a stored decline stays silent on every later page', () => {
  const b = browser({ cookie: 'aso_consent=0' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  b.rawWin.dispatchEvent(new Event('pagehide'));
  assert.equal(b.requests.length, 0);
  assert.equal(b.cookieWrites.length, 0);
});

test('a stored decline still lets the e-mail click through, without aid', () => {
  const b = browser({ url: `https://arenasoldout.com/?cid=${CID}`, cookie: 'aso_consent=0' });
  createAnalytics({ win: b.win, endpoint: b.endpoint }).start();
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].body.cid, CID);
  assert.equal(b.requests[0].body.aid, undefined);
});

test('accept after the e-mail click does not count the page a second time', () => {
  const b = browser({ url: `https://arenasoldout.com/?cid=${CID}` });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.accept();
  assert.deepEqual(names(b), ['page_view', 'consent']);
  assert.equal(b.requests[1].body.cid, undefined);
  assert.ok(b.requests[1].body.aid);
});

test('withdrawing and accepting again gives a new visitor id', () => {
  const b = browser({ cookie: 'aso_consent=1; aso_aid=a_storedvisitor1' });
  const a = createAnalytics({ win: b.win, endpoint: b.endpoint });
  a.start();
  a.decline();
  a.accept();
  const fresh = b.jar.get(AID_COOKIE);
  assert.ok(fresh && fresh !== 'a_storedvisitor1');
});

test('data-track labels: key calls to action only, label alphabet respected', () => {
  assert.equal(trackAction('/start'), 'apply');
  assert.equal(trackAction('/start#create'), 'apply');
  assert.equal(trackAction('/ru/start'), 'apply');
  assert.equal(trackAction('/contact'), 'contact');
  assert.equal(trackAction('/pricing#packages'), 'pricing');
  assert.equal(trackAction('/demo'), 'demo');
  assert.equal(trackAction('https://t.me/EventsCentrBot'), 'bot');
  assert.equal(trackAction('https://app.arenasoldout.com'), 'signin');
  assert.equal(trackAction('/solutions/concerts'), undefined);
  assert.equal(trackAction('https://example.com/start'), undefined);
  assert.equal(trackLabel('/start', 'hero'), 'apply.hero');
  assert.equal(trackLabel('/contact', 'Pricing venues!'), 'contact.pricing_venues');
  assert.equal(trackLabel('/blog', 'hero'), undefined);
  assert.match(trackLabel('/start', 'x'.repeat(200)) ?? '', /^[a-z0-9_.-]{1,64}$/);
});
