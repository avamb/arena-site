/**
 * Own product analytics on the site (spec 50, A2): consent state, the visitor cookie and the tracker.
 * No DOM of its own: the banner (consent-banner.ts) calls `accept` / `decline`; everything that decides
 * what may leave the browser lives here so that it can be tested without a browser.
 *
 * The rules (spec 50, sections 3 and 4):
 *  - the endpoint is empty by default: then nothing is created, nothing is sent, no cookie is written;
 *  - before a choice, and after a "decline", NOTHING is sent, with two exceptions that carry no visitor
 *    id: the one batch of a visit that arrived through an e-mail link (`?cid=`), and the `consent` event
 *    that records the choice itself;
 *  - `aid` is a random visitor id in the first-party cookie `aso_aid` (13 months). It exists only after
 *    "accept" and is deleted, and no longer sent, on "decline" or withdrawal;
 *  - `cid` rides in the first batch of the visit, and is removed from the address bar at once. It is kept in memory
 *    for the page life only: an Accept on the same page repeats it once with the new aid.
 */
import { createTracker, type Tracker, type TrackerContext } from '../lib/arena-track.ts';
import {
  AID_COOKIE, AID_MAX_AGE, AID_RE, CONSENT_COOKIE, CONSENT_MAX_AGE, cookieLine, newAid, parseCookies, readChoice, readCid, withoutCid,
  type Choice,
} from './consent-lib.ts';

export * from './consent-lib.ts';

/** sessionStorage key of the e-mail contact code held for the Umami loader (spec 52 section 13). */
const CONTACT_KEY = 'aso_contact';

export interface AnalyticsEnv {
  win: Window;
  endpoint: string;
  /** Test seam; defaults to the Web Crypto of the window. */
  random?: (n: number) => Uint8Array;
}

export interface Analytics {
  /** The stored choice: granted, denied, or null while the visitor has not chosen. */
  choice(): Choice;
  /** The visitor id currently held (only ever set after consent). */
  aid(): string | null;
  /** Page load: read and strip `cid`, report the page when allowed. Call once. */
  start(): void;
  accept(): void;
  decline(): void;
  /** True when an endpoint is configured, that is, when analytics exists at all. */
  active(): boolean;
}

export function createAnalytics(env: AnalyticsEnv): Analytics {
  const { win, endpoint } = env;
  const doc = win.document;
  const secure = win.location.protocol === 'https:';
  const random =
    env.random ??
    ((n: number) => {
      const b = new Uint8Array(n);
      if (win.crypto?.getRandomValues) win.crypto.getRandomValues(b);
      else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
      return b;
    });

  const writeCookie = (name: string, value: string, maxAge: number) => {
    try {
      doc.cookie = cookieLine(name, value, maxAge, secure);
    } catch {
      // Cookies blocked: the choice then lives for this page only.
    }
  };
  const readCookies = () => {
    try {
      return doc.cookie;
    } catch {
      return '';
    }
  };

  let choice: Choice = endpoint ? readChoice(readCookies()) : null;
  let memAid: string | null = null;
  /** The contact code still waiting for its first batch. */
  let pendingCid: string | null = null;
  /** The code of this page load, kept in memory only (never in a cookie or storage), so a later Accept can join it with the aid. */
  let visitCid: string | null = null;
  /** Opened for one batch that may leave without consent (the e-mail click, the consent event itself). */
  let burst = false;

  const aidNow = (): string | null => {
    if (choice !== 'granted') return null;
    const cookie = parseCookies(readCookies())[AID_COOKIE];
    if (cookie && AID_RE.test(cookie)) return (memAid = cookie);
    if (memAid && AID_RE.test(memAid)) {
      writeCookie(AID_COOKIE, memAid, AID_MAX_AGE);
      return memAid;
    }
    memAid = newAid(random);
    writeCookie(AID_COOKIE, memAid, AID_MAX_AGE);
    return memAid;
  };
  const dropAid = () => {
    memAid = null;
    try {
      doc.cookie = `${AID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`;
    } catch {
      // Nothing to delete when cookies are blocked.
    }
  };

  const tracker: Tracker = createTracker({
    endpoint,
    surface: 'site',
    enabled: () => burst || choice === 'granted',
    scrollDepth: true,
    win,
    // Read when an event is recorded (not when it is sent), so an event keeps the id it was recorded under.
    getContext: (): TrackerContext => {
      const ctx: TrackerContext = {};
      const aid = aidNow();
      if (aid) ctx.aid = aid;
      if (pendingCid) {
        ctx.cid = pendingCid;
        pendingCid = null;
      }
      return ctx;
    },
  });

  const through = (fn: () => void) => {
    burst = true;
    try {
      fn();
      tracker.flush();
    } finally {
      burst = false;
    }
  };

  const pageProps = () => {
    const loc = win.location;
    const p = new URLSearchParams(loc.search);
    const props: Record<string, string> = {
      path: loc.pathname,
      title: doc.title,
      lang: doc.documentElement.lang,
    };
    try {
      const host = doc.referrer ? new URL(doc.referrer).hostname : '';
      if (host && host !== loc.hostname) props.ref_host = host;
    } catch {
      // Not a URL.
    }
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = p.get(k);
      if (v) props[k] = v;
    }
    return props;
  };

  /** The page of this load went out once; a later "accept" must not count it a second time. */
  let reported = false;
  const report = () => {
    reported = true;
    tracker.view(win.location.pathname, pageProps());
  };

  return {
    choice: () => choice,
    aid: () => memAid,
    active: () => endpoint !== '',
    start() {
      const cid = readCid(win.location.search);
      const clean = withoutCid(win.location.pathname, win.location.search, win.location.hash);
      if (clean !== null) {
        try {
          win.history.replaceState(win.history.state, '', clean);
        } catch {
          // The address bar keeps the code; nothing else depends on it.
        }
      }
      // The contact code of an e-mail link, kept in memory for this page only, for the Umami loader in Base.astro
      // (it identifies the visit with it). Set even when own analytics is off: the code is already off the address bar.
      // Umami 3 builds a session from the id it is sent, so every later page of the visit has to send it too, or it lands in
      // another anonymous session. The code therefore stays in this tab's sessionStorage (gone when the tab closes, never a
      // cookie, never sent anywhere but as the Umami distinct id). Owner decision 14.11: no consent step for a mailing recipient.
      let contact = cid;
      try {
        if (cid !== null) win.sessionStorage.setItem(CONTACT_KEY, cid);
        else contact = readCid('?cid=' + encodeURIComponent(win.sessionStorage.getItem(CONTACT_KEY) ?? ''));
      } catch {
        // Storage blocked: the landing page is still identified, the pages after it are not.
      }
      if (contact !== null) (win as unknown as { __asoContact?: string }).__asoContact = contact;
      if (!endpoint) return;
      pendingCid = cid;
      visitCid = cid;
      if (choice === 'granted') {
        aidNow();
        report();
      } else if (cid !== null) {
        // The e-mail click is recorded without consent, with the code and no visitor id.
        through(report);
      }
    },
    accept() {
      if (!endpoint || choice === 'granted') return;
      // Time on the page so far was spent before the choice: close it while it is still not recordable.
      tracker.settle();
      choice = 'granted';
      writeCookie(CONSENT_COOKIE, '1', CONSENT_MAX_AGE);
      aidNow();
      // A new visitor who came through an e-mail link and now accepts: the first batch with the new aid carries
      // the code once more (same pv, so the server counts one click) and the contact is joined to the visitor.
      pendingCid = visitCid;
      if (!reported) report();
      tracker.track('consent', { analytics: true });
      tracker.flush();
    },
    decline() {
      if (!endpoint || choice === 'denied') return;
      // Whatever was collected under the earlier consent leaves with its id, then the id is gone.
      if (choice === 'granted') {
        tracker.settle();
        tracker.flush();
      }
      choice = 'denied';
      dropAid();
      writeCookie(CONSENT_COOKIE, '0', CONSENT_MAX_AGE);
      through(() => tracker.track('consent', { analytics: false }));
    },
  };
}
