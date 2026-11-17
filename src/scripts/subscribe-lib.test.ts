import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_KEY, EVENTS, SHOWN_KEY, STORE_KEY, blockedReason, buildPayload, confirmOutcome, createPopup, isExcluded, isValidEmail, parseUtm,
  popupMode, readContactId, readState, readToken, scrollPercent, stripLocale, subscribeErrorKey, writeState,
  type KV, type PopupEnv, type PopupMode, type SubscribeConfig,
} from './subscribe-lib.ts';

const DAY = 86_400_000;
const LANGS = ['en', 'es', 'pt', 'de', 'fr', 'it', 'pl', 'uk', 'ru', 'cs', 'no'];
const CONFIG: SubscribeConfig = {
  scrollPercent: 45, afterSeconds: 40, pauseDays: 30, consentVersion: '2026-11-17',
  excludePaths: ['/start', '/checkout', '/pay'], mobileMaxWidth: 720, enabled: true,
};

/** An in-memory Storage; `broken` makes every access throw, like a blocked one in private mode. */
function memory(initial: Record<string, string> = {}, broken = false): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(k) { if (broken) throw new Error('blocked'); return data.get(k) ?? null; },
    setItem(k, v) { if (broken) throw new Error('blocked'); data.set(k, v); },
  };
}

/** A page: fake clock, fake timers, consent banner flag, and the modes the popup was shown in. */
function page(opts: {
  config?: Partial<SubscribeConfig>; local?: Record<string, string>; session?: Record<string, string>; path?: string; search?: string;
  width?: number; consent?: boolean; broken?: boolean; now?: number;
} = {}) {
  const local = memory(opts.local, opts.broken);
  const session = memory(opts.session, opts.broken);
  const timers: { fn: () => void; ms: number; live: boolean }[] = [];
  const shows: PopupMode[] = [];
  const clock = { now: opts.now ?? 1_800_000_000_000 };
  const flags = { consent: opts.consent ?? false, width: opts.width ?? 1280 };
  const env: PopupEnv = {
    config: { ...CONFIG, ...opts.config },
    langs: LANGS,
    local, session,
    now: () => clock.now,
    path: opts.path ?? '/pricing',
    search: opts.search ?? '',
    width: () => flags.width,
    consentVisible: () => flags.consent,
    setTimer: (fn, ms) => { const t = { fn, ms, live: true }; timers.push(t); return t; },
    clearTimer: (h) => { (h as { live: boolean }).live = false; },
    show: (m) => { shows.push(m); },
  };
  const popup = createPopup(env);
  /** Let `ms` of the page's life pass: fires every live timer due by then. */
  const wait = (ms: number) => { for (const t of timers) if (t.live && t.ms <= ms) { t.live = false; t.fn(); } };
  return { env, popup, local, session, timers, shows, clock, flags, wait };
}

/* ---------- triggers ---------- */

test('time trigger: the popup shows after afterSeconds, not before', () => {
  const p = page();
  p.popup.start();
  assert.equal(p.timers.length, 1);
  assert.equal(p.timers[0].ms, 40_000);
  p.wait(39_000);
  assert.deepEqual(p.shows, []);
  p.wait(40_000);
  assert.deepEqual(p.shows, ['dialog']);
  assert.equal(p.popup.shown, true);
});

test('scroll trigger: shows at scrollPercent of the scrollable range, not before', () => {
  const p = page();
  p.popup.start();
  p.popup.scrolled(scrollPercent(100, 800, 4000)); // 3.1 %
  assert.deepEqual(p.shows, []);
  p.popup.scrolled(scrollPercent(1440, 800, 4000)); // 45 %
  assert.deepEqual(p.shows, ['dialog']);
});

test('scroll percentage: share of the scrollable range, 0 when the page does not scroll', () => {
  assert.equal(scrollPercent(0, 800, 4000), 0);
  assert.equal(scrollPercent(1600, 800, 4000), 50);
  assert.equal(scrollPercent(9999, 800, 4000), 100);
  assert.equal(scrollPercent(50, 800, 800), 0);
  assert.equal(scrollPercent(50, 800, 600), 0);
});

test('whichever comes first wins, and the popup never shows twice on one page', () => {
  const p = page();
  p.popup.start();
  p.popup.scrolled(60);
  p.popup.scrolled(80);
  p.wait(40_000);
  assert.equal(p.shows.length, 1);
  assert.equal(p.timers[0].live, false, 'the timer is cleared once the popup is out');
});

test('once per visit: the sessionStorage flag keeps the next page of the visit quiet', () => {
  const first = page();
  first.popup.start();
  first.popup.scrolled(50);
  assert.equal(first.shows.length, 1);
  assert.equal(first.session.data.get(SHOWN_KEY), '1');
  const second = page({ session: Object.fromEntries(first.session.data) });
  second.popup.start();
  second.popup.scrolled(90);
  second.wait(60_000);
  assert.deepEqual(second.shows, []);
  assert.equal(second.timers.length, 0, 'no timer is even armed');
});

test('a dismissed popup that never showed does not set the shown flag, and nothing shows below the trigger', () => {
  const p = page();
  p.popup.start();
  assert.equal(p.session.data.has(SHOWN_KEY), false);
  p.popup.scrolled(10);
  assert.equal(p.session.data.has(SHOWN_KEY), false);
});

/* ---------- dismissed / subscribed ---------- */

test('closing sets dismissedAt', () => {
  const p = page();
  p.popup.dismiss();
  assert.deepEqual(readState(p.local), { dismissedAt: p.clock.now });
});

test('dismissed less than pauseDays ago: never shown', () => {
  const now = 1_800_000_000_000;
  const p = page({ now, local: { [STORE_KEY]: JSON.stringify({ dismissedAt: now - 29 * DAY }) } });
  assert.equal(blockedReason(p.env), 'paused');
  p.popup.start();
  p.popup.scrolled(99);
  assert.deepEqual(p.shows, []);
});

test('dismissed more than pauseDays ago: shown again', () => {
  const now = 1_800_000_000_000;
  const p = page({ now, local: { [STORE_KEY]: JSON.stringify({ dismissedAt: now - 31 * DAY }) } });
  assert.equal(blockedReason(p.env), null);
  p.popup.start();
  p.popup.scrolled(60);
  assert.deepEqual(p.shows, ['dialog']);
});

test('pauseDays comes from the config', () => {
  const now = 1_800_000_000_000;
  const local = { [STORE_KEY]: JSON.stringify({ dismissedAt: now - 5 * DAY }) };
  assert.equal(blockedReason(page({ now, local, config: { pauseDays: 7 } }).env), 'paused');
  assert.equal(blockedReason(page({ now, local, config: { pauseDays: 3 } }).env), null);
});

test('subscribed: never shown, however long ago, and subscribed() writes subscribedAt', () => {
  const now = 1_800_000_000_000;
  const p = page({ now, local: { [STORE_KEY]: JSON.stringify({ subscribedAt: now - 900 * DAY, dismissedAt: now - 900 * DAY }) } });
  assert.equal(blockedReason(p.env), 'subscribed');
  p.popup.start();
  p.popup.scrolled(99);
  p.wait(60_000);
  assert.deepEqual(p.shows, []);

  const q = page({ now });
  q.popup.subscribed();
  assert.deepEqual(readState(q.local), { subscribedAt: now });
  assert.equal(blockedReason(q.env), 'subscribed');
});

test('subscribing on the page (footer form) stops a popup that has not shown yet', () => {
  const p = page();
  p.popup.start();
  p.popup.subscribed();
  p.popup.scrolled(90);
  assert.deepEqual(p.shows, []);
});

test('writeState merges: dismissing after subscribing keeps subscribedAt', () => {
  const s = memory();
  writeState(s, { subscribedAt: 5 });
  writeState(s, { dismissedAt: 9 });
  assert.deepEqual(readState(s), { subscribedAt: 5, dismissedAt: 9 });
});

test('garbage in storage is ignored', () => {
  for (const raw of ['', 'not json', '[]', '{"dismissedAt":"yesterday"}', 'null']) {
    assert.deepEqual(readState(memory({ [STORE_KEY]: raw })), {}, raw);
  }
});

/* ---------- other blockers ---------- */

test('a visitor from an e-mail link (aso_contact) never sees the popup', () => {
  const p = page({ session: { [CONTACT_KEY]: 'k3m9x2q7ab' } });
  assert.equal(blockedReason(p.env), 'contact');
  p.popup.start();
  p.popup.scrolled(99);
  assert.deepEqual(p.shows, []);
  assert.equal(readContactId(p.session), 'k3m9x2q7ab');
});

test('a ?cid= still in the address bar counts as an e-mail visitor too', () => {
  assert.equal(blockedReason(page({ search: '?cid=k3m9x2q7ab&utm_source=mail' }).env), 'contact');
});

test('excluded paths, also behind a language prefix, as a prefix of segments', () => {
  assert.equal(isExcluded('/start', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/start/continue', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/es/start', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/es/start/x', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/ru/checkout', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/pay/', CONFIG.excludePaths, LANGS), true);
  assert.equal(isExcluded('/startup', CONFIG.excludePaths, LANGS), false);
  assert.equal(isExcluded('/pricing', CONFIG.excludePaths, LANGS), false);
  assert.equal(isExcluded('/blog/start', CONFIG.excludePaths, LANGS), false);
  assert.equal(isExcluded('/', CONFIG.excludePaths, LANGS), false);
  assert.equal(isExcluded('/es', CONFIG.excludePaths, LANGS), false);
  const p = page({ path: '/es/start/continue' });
  assert.equal(blockedReason(p.env), 'excluded');
  p.popup.start();
  p.popup.scrolled(99);
  assert.deepEqual(p.shows, []);
});

test('stripLocale only strips a known language code', () => {
  assert.equal(stripLocale('/es/pricing', LANGS), '/pricing');
  assert.equal(stripLocale('/es', LANGS), '/');
  assert.equal(stripLocale('/es/', LANGS), '/');
  assert.equal(stripLocale('/xx/pricing', LANGS), '/xx/pricing');
  assert.equal(stripLocale('/pricing?a=1#b', LANGS), '/pricing');
});

test('enabled: false switches the popup off', () => {
  const p = page({ config: { enabled: false } });
  assert.equal(blockedReason(p.env), 'disabled');
  p.popup.start();
  p.popup.scrolled(99);
  assert.deepEqual(p.shows, []);
  assert.equal(p.timers.length, 0);
});

/* ---------- mode ---------- */

test('desktop gets the dialog, a narrow viewport the bar', () => {
  assert.equal(popupMode(721, 720), 'dialog');
  assert.equal(popupMode(720, 720), 'bar');
  assert.equal(popupMode(390, 720), 'bar');
  const wide = page({ width: 1440 });
  wide.popup.start();
  wide.popup.scrolled(50);
  assert.deepEqual(wide.shows, ['dialog']);
  const narrow = page({ width: 390 });
  narrow.popup.start();
  narrow.popup.scrolled(50);
  assert.deepEqual(narrow.shows, ['bar']);
});

/* ---------- consent banner ---------- */

test('with the consent banner up the popup waits, then shows once it is hidden', () => {
  const p = page({ consent: true });
  p.popup.start();
  p.popup.scrolled(70);
  p.wait(40_000);
  assert.deepEqual(p.shows, []);
  assert.equal(p.session.data.has(SHOWN_KEY), false, 'a postponed popup is not "shown"');
  p.popup.consentChanged(); // banner still up: nothing
  assert.deepEqual(p.shows, []);
  p.flags.consent = false;
  p.popup.consentChanged();
  assert.deepEqual(p.shows, ['dialog']);
  p.popup.consentChanged();
  assert.equal(p.shows.length, 1);
});

test('the banner going away without a trigger does not show the popup by itself', () => {
  const p = page({ consent: true });
  p.popup.start();
  p.flags.consent = false;
  p.popup.consentChanged();
  assert.deepEqual(p.shows, []);
  p.popup.scrolled(50);
  assert.deepEqual(p.shows, ['dialog']);
});

test('after the banner the same rules still apply: a subscription made meanwhile blocks the popup', () => {
  const p = page({ consent: true });
  p.popup.start();
  p.popup.scrolled(70);
  writeState(p.local, { subscribedAt: p.clock.now });
  p.flags.consent = false;
  p.popup.consentChanged();
  assert.deepEqual(p.shows, []);
});

/* ---------- broken storage ---------- */

test('blocked storage never throws and the popup still works', () => {
  const p = page({ broken: true });
  assert.deepEqual(readState(p.local), {});
  assert.equal(readContactId(p.session), undefined);
  assert.equal(blockedReason(p.env), null);
  p.popup.start();
  p.popup.scrolled(50);
  assert.deepEqual(p.shows, ['dialog']);
  assert.doesNotThrow(() => p.popup.dismiss());
  assert.doesNotThrow(() => p.popup.subscribed());
  assert.equal(writeState(p.local, { dismissedAt: 1 }), false);
});

test('no storage at all (null) behaves like empty storage', () => {
  assert.deepEqual(readState(null), {});
  assert.equal(readContactId(null), undefined);
  assert.equal(writeState(null, { dismissedAt: 1 }), false);
});

/* ---------- form helpers ---------- */

test('utm parsing keeps only the five known keys, non-empty', () => {
  assert.deepEqual(parseUtm('?utm_source=newsletter&utm_medium=email&utm_campaign=nov&utm_term=&utm_content=a%20b&x=1'), {
    source: 'newsletter', medium: 'email', campaign: 'nov', content: 'a b',
  });
  assert.deepEqual(parseUtm(''), {});
  assert.deepEqual(parseUtm('?utm_source=%20%20'), {});
  assert.equal(parseUtm(`?utm_source=${'a'.repeat(500)}`).source?.length, 200);
});

test('token is read from ?t= and malformed ones are refused', () => {
  assert.equal(readToken('?t=AbCdEf012345_-xyz'), 'AbCdEf012345_-xyz');
  assert.equal(readToken('?foo=1&t=abcdefgh12345678'), 'abcdefgh12345678');
  assert.equal(readToken(''), '');
  assert.equal(readToken('?t='), '');
  assert.equal(readToken('?t=short'), '');
  assert.equal(readToken('?t=<script>alert(1)</script>'), '');
});

test('e-mail check: the same shape as the contact form', () => {
  assert.equal(isValidEmail(' a@b.co '), true);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a b@c.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('payload: cid only when present, utm only non-empty, consent version carried', () => {
  const base = { email: ' me@example.com ', lang: 'es', source: 'footer' as const, path: '/es/pricing', search: '?utm_source=x', consentVersion: '2026-11-17', website: '', token: 'tok' };
  const withCid = buildPayload({ ...base, session: memory({ [CONTACT_KEY]: 'k3m9x2q7ab' }) });
  assert.deepEqual(withCid, {
    email: 'me@example.com', lang: 'es', source: 'footer', page: '/es/pricing', utm: { source: 'x' }, cid: 'k3m9x2q7ab',
    consent: '2026-11-17', website: '', turnstile_token: 'tok',
  });
  const without = buildPayload({ ...base, search: '', session: memory() });
  assert.equal('cid' in without, false);
  assert.deepEqual(without.utm, {});
  assert.equal('cid' in buildPayload({ ...base, session: null }), false);
});

test('answers of the API map to the message to show', () => {
  assert.equal(subscribeErrorKey(400, 'invalid'), 'invalid');
  assert.equal(subscribeErrorKey(403, 'turnstile'), 'turnstile');
  assert.equal(subscribeErrorKey(429, 'rate'), 'rate');
  assert.equal(subscribeErrorKey(503, 'unavailable'), 'unavailable');
  assert.equal(subscribeErrorKey(502, 'unavailable'), 'unavailable');
  assert.equal(subscribeErrorKey(500, undefined), 'unavailable');
  assert.equal(confirmOutcome(200, undefined), 'ok');
  assert.equal(confirmOutcome(410, 'expired'), 'expired');
  assert.equal(confirmOutcome(404, 'token'), 'invalid');
});

test('event names are the agreed ones', () => {
  assert.deepEqual(Object.values(EVENTS).sort(), [
    'subscribe_confirm_failed', 'subscribe_confirmed', 'subscribe_email_entered', 'subscribe_popup_close', 'subscribe_popup_view', 'subscribe_submit',
  ]);
});
