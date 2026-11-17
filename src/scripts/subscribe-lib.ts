/**
 * E-mail subscription (warm list): everything that DECIDES something lives here, with no DOM access at
 * import time. Storage, clock, timers, path and viewport are injected, so the rules are tested in Node
 * (subscribe-lib.test.ts); subscribe.ts only wires them to the page.
 *
 * Popup rules (all numbers come from `subscribe` in site.config.ts):
 *  - shown when the visitor has scrolled `scrollPercent` of the page OR `afterSeconds` have passed,
 *    whichever comes first, at most once per visit (sessionStorage flag);
 *  - never when `subscribedAt` is stored (forever), nor within `pauseDays` of `dismissedAt`;
 *  - never for a visitor who came from an e-mail link (sessionStorage `aso_contact`), on an excluded path,
 *    or when the feature is switched off;
 *  - never over the consent banner: it waits until the banner is hidden;
 *  - every storage access is guarded, a blocked storage (private mode) never throws.
 * The footer form is not subject to any of this.
 */

export interface SubscribeConfig {
  scrollPercent: number;
  afterSeconds: number;
  pauseDays: number;
  consentVersion: string;
  excludePaths: readonly string[];
  mobileMaxWidth: number;
  enabled: boolean;
}

/** Umami event names. Their data is always { source, lang }. */
export const EVENTS = {
  popupView: 'subscribe_popup_view',
  popupClose: 'subscribe_popup_close',
  emailEntered: 'subscribe_email_entered',
  submit: 'subscribe_submit',
  confirmed: 'subscribe_confirmed',
  confirmFailed: 'subscribe_confirm_failed',
} as const;

export type Source = 'popup' | 'footer';
export type PopupMode = 'dialog' | 'bar';

/** localStorage key of the visitor's own subscription state. */
export const STORE_KEY = 'aso_sub';
/** sessionStorage flag: the popup was already shown during this visit. */
export const SHOWN_KEY = 'aso_sub_shown';
/** sessionStorage key of the e-mail contact code (analytics.ts). */
export const CONTACT_KEY = 'aso_contact';
const DAY_MS = 86_400_000;

/** The slice of Storage the rules need. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SubState {
  dismissedAt?: number;
  subscribedAt?: number;
}

/* ---------- storage ---------- */

export function readState(storage: KV | null): SubState {
  try {
    const raw = storage?.getItem(STORE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: SubState = {};
    if (typeof v.dismissedAt === 'number' && Number.isFinite(v.dismissedAt)) out.dismissedAt = v.dismissedAt;
    if (typeof v.subscribedAt === 'number' && Number.isFinite(v.subscribedAt)) out.subscribedAt = v.subscribedAt;
    return out;
  } catch {
    return {};
  }
}

/** Merge `patch` into the stored state. Returns false when the storage is not usable. */
export function writeState(storage: KV | null, patch: SubState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORE_KEY, JSON.stringify({ ...readState(storage), ...patch }));
    return true;
  } catch {
    return false;
  }
}

function safeGet(storage: KV | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage: KV | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage blocked: the rule that needed it simply does not hold back.
  }
}

/** The e-mail contact code, when the visit started from a mailing link. */
export function readContactId(session: KV | null): string | undefined {
  const v = safeGet(session, CONTACT_KEY);
  return v ? v : undefined;
}

/* ---------- paths ---------- */

/** The path without its language prefix: `/es/start/x` -> `/start/x`, `/es` -> `/`. */
export function stripLocale(path: string, langs: readonly string[]): string {
  const clean = path.replace(/[?#].*$/, '');
  const m = clean.match(/^\/([a-z]{2})(\/.*)?$/);
  if (m && langs.includes(m[1])) return m[2] && m[2] !== '/' ? m[2] : '/';
  return clean || '/';
}

/** `excluded` entries match as a prefix of segments: '/start' covers '/start' and '/start/x', not '/startup'. */
export function isExcluded(path: string, excluded: readonly string[], langs: readonly string[]): boolean {
  const p = stripLocale(path, langs).replace(/(.)\/$/, '$1');
  return excluded.some((e) => {
    const x = e.replace(/(.)\/$/, '$1');
    return p === x || p.startsWith(x + '/');
  });
}

/* ---------- popup rules ---------- */

export function popupMode(width: number, mobileMaxWidth: number): PopupMode {
  return width > mobileMaxWidth ? 'dialog' : 'bar';
}

export type BlockReason = 'disabled' | 'subscribed' | 'paused' | 'contact' | 'excluded' | 'shown';

export interface PopupEnv {
  config: SubscribeConfig;
  /** Language codes of the site, to strip the prefix from the path. */
  langs: readonly string[];
  local: KV | null;
  session: KV | null;
  now: () => number;
  /** location.pathname */
  path: string;
  /** location.search, to catch a ?cid= that analytics has not moved to the session yet. */
  search?: string;
  width: () => number;
  /** True while the consent banner is on screen. */
  consentVisible: () => boolean;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  show: (mode: PopupMode) => void;
}

/** Why the popup must not appear right now, or null. Consent banner and triggers are handled by the controller. */
export function blockedReason(env: PopupEnv): BlockReason | null {
  const c = env.config;
  if (!c.enabled) return 'disabled';
  const s = readState(env.local);
  if (s.subscribedAt !== undefined) return 'subscribed';
  if (s.dismissedAt !== undefined && env.now() - s.dismissedAt < c.pauseDays * DAY_MS) return 'paused';
  if (readContactId(env.session) !== undefined || /[?&]cid=/.test(env.search ?? '')) return 'contact';
  if (isExcluded(env.path, c.excludePaths, env.langs)) return 'excluded';
  if (safeGet(env.session, SHOWN_KEY) !== null) return 'shown';
  return null;
}

/** Scrolled share of the scrollable range in percent; 0 when the page does not scroll. */
export function scrollPercent(scrollY: number, viewportHeight: number, pageHeight: number): number {
  const range = pageHeight - viewportHeight;
  if (!(range > 0)) return 0;
  return Math.max(0, Math.min(100, (scrollY / range) * 100));
}

export interface PopupController {
  /** Page load: starts the timer unless the popup can never show on this page. */
  start(): void;
  /** Feed the current scrolled percentage. */
  scrolled(percent: number): void;
  /** The consent banner was hidden (or changed): shows the popup when a trigger had already fired. */
  consentChanged(): void;
  /** The visitor closed the popup. */
  dismiss(): void;
  /** A sign-up succeeded anywhere on the page. */
  subscribed(): void;
  /** True once the popup was shown by this controller. */
  readonly shown: boolean;
}

export function createPopup(env: PopupEnv): PopupController {
  let timer: unknown = null;
  let pending = false;
  let shown = false;

  const stopTimer = () => {
    if (timer !== null) env.clearTimer(timer);
    timer = null;
  };

  function attempt(): void {
    if (shown) return;
    if (blockedReason(env) !== null) {
      pending = false;
      return;
    }
    if (env.consentVisible()) {
      pending = true; // a trigger fired but the banner is up: wait for it to go
      return;
    }
    pending = false;
    shown = true;
    stopTimer();
    safeSet(env.session, SHOWN_KEY, '1');
    env.show(popupMode(env.width(), env.config.mobileMaxWidth));
  }

  return {
    start() {
      if (shown || timer !== null) return;
      if (blockedReason(env) !== null) return;
      timer = env.setTimer(() => {
        timer = null;
        attempt();
      }, env.config.afterSeconds * 1000);
    },
    scrolled(percent) {
      if (shown || percent < env.config.scrollPercent) return;
      attempt();
    },
    consentChanged() {
      if (pending && !env.consentVisible()) attempt();
    },
    dismiss() {
      writeState(env.local, { dismissedAt: env.now() });
    },
    subscribed() {
      writeState(env.local, { subscribedAt: env.now() });
      pending = false;
      stopTimer();
    },
    get shown() {
      return shown;
    },
  };
}

/* ---------- form payload ---------- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;

/** `utm_*` query parameters, non-empty ones only. */
export function parseUtm(search: string): Partial<Record<(typeof UTM_KEYS)[number], string>> {
  const out: Partial<Record<(typeof UTM_KEYS)[number], string>> = {};
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return out;
  }
  for (const k of UTM_KEYS) {
    const v = params.get(`utm_${k}`)?.trim();
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}

/** The token of a confirmation / unsubscribe link: `?t=<token>`. Empty string when absent or malformed. */
export function readToken(search: string): string {
  try {
    const v = new URLSearchParams(search).get('t')?.trim() ?? '';
    return /^[\w.~-]{8,512}$/.test(v) ? v : '';
  } catch {
    return '';
  }
}

export interface PayloadInput {
  email: string;
  lang: string;
  source: Source;
  path: string;
  search: string;
  session: KV | null;
  consentVersion: string;
  website: string;
  token: string;
}

export interface SubscribePayload {
  email: string;
  lang: string;
  source: Source;
  page: string;
  utm: Record<string, string>;
  cid?: string;
  consent: string;
  website: string;
  turnstile_token: string;
}

/** Body of POST /api/subscribe. `cid` is present only when the visit came from an e-mail link. */
export function buildPayload(i: PayloadInput): SubscribePayload {
  const cid = readContactId(i.session);
  return {
    email: i.email.trim(),
    lang: i.lang,
    source: i.source,
    page: i.path,
    utm: parseUtm(i.search),
    ...(cid !== undefined ? { cid } : {}),
    consent: i.consentVersion,
    website: i.website,
    turnstile_token: i.token,
  };
}

/** Which message to show for an answer of /api/subscribe: the error key of the i18n table. */
export function subscribeErrorKey(status: number, error: string | undefined): 'invalid' | 'turnstile' | 'rate' | 'unavailable' {
  if (error === 'invalid' || status === 400) return 'invalid';
  if (error === 'turnstile' || status === 403) return 'turnstile';
  if (error === 'rate' || status === 429) return 'rate';
  return 'unavailable';
}

/** Which text the confirmation page shows for an answer of /api/subscribe/confirm. */
export function confirmOutcome(status: number, error: string | undefined): 'ok' | 'expired' | 'invalid' {
  if (status === 200 && !error) return 'ok';
  if (status === 410 || error === 'expired') return 'expired';
  return 'invalid';
}
