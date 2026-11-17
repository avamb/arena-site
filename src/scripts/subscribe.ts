/**
 * E-mail subscription (warm list): wires the forms (popup, mobile bar, footer), the popup rules and the
 * two e-mail landing pages to the page. Every decision is in subscribe-lib.ts. Modelled on contact.ts:
 * Turnstile loads lazily (first focus or input of a form, never on page load), JSON POST, a status line.
 * Umami events go through `window.umami?.track`, guarded, with data { source, lang }.
 */
import {
  EVENTS, buildPayload, confirmOutcome, createPopup, isValidEmail, readToken, scrollPercent, subscribeErrorKey, writeState,
  type KV, type PopupMode, type Source, type SubscribeConfig,
} from './subscribe-lib';

type Ts = { render: (c: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
type Track = (name: string, data: Record<string, unknown>) => void;

const tsGlobal = () => (window as unknown as { turnstile?: Ts }).turnstile;
const store = (kind: 'localStorage' | 'sessionStorage'): KV | null => {
  try {
    return window[kind];
  } catch {
    return null; // blocked storage throws on access
  }
};
const local = store('localStorage');
const session = store('sessionStorage');

const track: Track = (name, data) => {
  try {
    const u = (window as unknown as { umami?: { track?: Track } }).umami;
    if (u && typeof u.track === 'function') u.track(name, data);
  } catch {
    // Analytics must never break the form.
  }
};

/* ---------- Turnstile, loaded on demand ---------- */

let tsLoading: Promise<void> | null = null;
const loadTurnstile = () => (tsLoading ??= new Promise<void>((resolve) => {
  if (tsGlobal()) return resolve();
  const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile"]');
  if (existing) {
    // The contact dialog already asked for it: wait until it is there.
    let waited = 0;
    const timer = setInterval(() => {
      waited += 100;
      if (tsGlobal() || waited >= 10_000) { clearInterval(timer); resolve(); }
    }, 100);
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => resolve();
  document.head.append(s);
}));

/* ---------- one form ---------- */

function setup(form: HTMLFormElement, onSubscribed: () => void) {
  if (form.dataset.ready) return;
  form.dataset.ready = '1';
  const source = (form.dataset.source === 'footer' ? 'footer' : 'popup') as Source;
  const lang = form.dataset.lang ?? 'en';
  const errors = JSON.parse(form.dataset.errors ?? '{}') as Record<string, string>;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const box = form.querySelector<HTMLElement>('[data-turnstile]')!;
  const emailInput = form.querySelector<HTMLInputElement>('input[name=email]')!;
  const siteKey = form.dataset.sitekey ?? '';
  const data = { source, lang };
  let token = '';
  let widget = '';
  let starting = false;
  let entered = false;
  const say = (text: string, state: 'error' | 'success' | '' = '') => { status.textContent = text; status.dataset.state = state; };

  const startTurnstile = () => {
    if (!siteKey || starting) return;
    starting = true;
    void loadTurnstile().then(() => {
      const ts = tsGlobal();
      if (!ts || widget) return;
      widget = ts.render(box, {
        sitekey: siteKey,
        size: 'flexible',
        appearance: 'interaction-only',
        language: lang,
        callback: (v: string) => { token = v; },
        'expired-callback': () => { token = ''; },
        'error-callback': () => { token = ''; },
        'before-interactive-callback': () => { box.dataset.active = ''; },
        'after-interactive-callback': () => { delete box.dataset.active; },
      });
    });
  };
  // Loaded when the visitor first touches the form, not on page load.
  form.addEventListener('focusin', startTurnstile, { once: true });
  form.addEventListener('input', startTurnstile, { once: true });

  const checkEntered = () => {
    if (entered || !isValidEmail(emailInput.value)) return;
    entered = true;
    track(EVENTS.emailEntered, data);
  };
  emailInput.addEventListener('blur', checkEntered);
  emailInput.addEventListener('change', checkEntered);

  /** A token usually arrives while the visitor types; if they were quick, wait for it a few seconds. */
  const waitForToken = async (ms: number) => {
    startTurnstile();
    for (let waited = 0; !token && waited < ms; waited += 200) await new Promise((r) => setTimeout(r, 200));
    return token;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const valid = isValidEmail(fd.email ?? '');
    emailInput.closest('.field')?.toggleAttribute('data-invalid', !valid);
    if (!valid) { say(errors.invalid ?? '', 'error'); return; }
    button.disabled = true;
    say(form.dataset.sending ?? '');
    try {
      if (siteKey && !(await waitForToken(10_000))) { say(errors.turnstile ?? '', 'error'); return; }
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({
          email: fd.email, lang, source, path: location.pathname, search: location.search, session,
          consentVersion: form.dataset.consent ?? '', website: fd.website ?? '', token,
        })),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        form.reset();
        form.dataset.done = '1';
        say((form.dataset.sent ?? '').replace('{email}', fd.email.trim()), 'success');
        track(EVENTS.submit, data);
        onSubscribed();
      } else {
        say(errors[subscribeErrorKey(res.status, body.error)] ?? errors.unavailable ?? '', 'error');
      }
    } catch {
      say(errors.network ?? '', 'error');
    } finally {
      button.disabled = false;
      token = '';
      tsGlobal()?.reset(widget || undefined);
    }
  });
}

/* ---------- popup and footer ---------- */

const root = document.querySelector<HTMLElement>('[data-subscribe-root]');
let popup: ReturnType<typeof createPopup> | null = null;
const onSubscribed = () => {
  if (popup) popup.subscribed();
  else writeState(local, { subscribedAt: Date.now() }); // popup switched off or absent: the footer still remembers
};

document.querySelectorAll<HTMLFormElement>('.fsub [data-subscribe-form]').forEach((f) => setup(f, onSubscribed));

if (root) {
  const lang = root.dataset.lang ?? 'en';
  const config = JSON.parse(root.dataset.config ?? '{}') as SubscribeConfig;
  const langs = JSON.parse(root.dataset.langs ?? '[]') as string[];
  const dialog = root.querySelector<HTMLDialogElement>('#subscribe-dialog')!;
  const bar = root.querySelector<HTMLElement>('#subscribe-bar')!;
  root.querySelectorAll<HTMLFormElement>('[data-subscribe-form]').forEach((f) => setup(f, onSubscribed));
  const consent = document.getElementById('aso-consent');
  const data = { source: 'popup' as Source, lang };
  let open: PopupMode | null = null;

  popup = createPopup({
    config,
    langs,
    local,
    session,
    now: () => Date.now(),
    path: location.pathname,
    search: location.search,
    width: () => window.innerWidth,
    consentVisible: () => !!consent && consent.hidden === false,
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (h) => window.clearTimeout(h as number),
    show(mode) {
      // Without <dialog> support the bar is the fallback.
      const m: PopupMode = mode === 'dialog' && typeof dialog.showModal === 'function' ? 'dialog' : 'bar';
      open = m;
      if (m === 'dialog') dialog.showModal();
      else bar.hidden = false;
      track(EVENTS.popupView, data);
    },
  });

  const closed = () => {
    if (!open) return;
    open = null;
    popup!.dismiss();
    track(EVENTS.popupClose, data);
  };
  // Esc, the close button and a click on the backdrop all end in the dialog's own close event.
  dialog.addEventListener('close', closed);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || (e.target as Element).closest('[data-sub-close]')) dialog.close();
  });
  bar.querySelector('[data-sub-close]')?.addEventListener('click', () => { bar.hidden = true; closed(); });

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    // A short timeout rather than requestAnimationFrame: rAF does not run while the page is hidden or in a throttled frame.
    setTimeout(() => {
      ticking = false;
      const el = document.documentElement;
      popup!.scrolled(scrollPercent(window.scrollY, window.innerHeight, el.scrollHeight));
      if (popup!.shown) window.removeEventListener('scroll', onScroll);
    }, 100);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  if (consent) new MutationObserver(() => popup!.consentChanged()).observe(consent, { attributes: true, attributeFilter: ['hidden'] });
  popup.start();
}

/* ---------- /subscribe/confirm and /subscribe/unsubscribe (links from the e-mails) ---------- */

async function postToken(path: string, token: string): Promise<{ status: number; error?: string }> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { status: res.status, error: body.error };
}

const confirmEl = document.querySelector<HTMLElement>('[data-sub-confirm]');
if (confirmEl) {
  const lang = confirmEl.dataset.lang ?? 'en';
  const data = { source: 'email', lang };
  const show = (key: 'ok' | 'expired' | 'invalid' | 'network') => { confirmEl.textContent = confirmEl.dataset[key] ?? ''; confirmEl.dataset.state = key === 'ok' ? 'success' : 'error'; };
  const token = readToken(location.search);
  if (!token) {
    show('invalid');
    track(EVENTS.confirmFailed, data);
  } else {
    postToken('/api/subscribe/confirm', token).then((r) => {
      const out = confirmOutcome(r.status, r.error);
      // 5xx and the like are not "invalid link": the same link may work a minute later.
      const unavailable = out === 'invalid' && r.status !== 404 && r.status !== 400;
      show(unavailable ? 'network' : out);
      if (out === 'ok') {
        writeState(local, { subscribedAt: Date.now() });
        track(EVENTS.confirmed, data);
      } else track(EVENTS.confirmFailed, data);
    }).catch(() => { show('network'); track(EVENTS.confirmFailed, data); });
  }
}

const unsubEl = document.querySelector<HTMLElement>('[data-sub-unsub]');
if (unsubEl) {
  const btn = unsubEl.querySelector<HTMLButtonElement>('button')!;
  const out = unsubEl.querySelector<HTMLElement>('[data-status]')!;
  const token = readToken(location.search);
  const say = (key: 'done' | 'invalid' | 'network') => { out.textContent = unsubEl.dataset[key] ?? ''; out.dataset.state = key === 'done' ? 'success' : 'error'; };
  if (!token) { btn.hidden = true; say('invalid'); }
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const r = await postToken('/api/subscribe/unsubscribe', token);
      if (r.status === 200 && !r.error) { btn.hidden = true; say('done'); }
      else { say(r.status === 404 ? 'invalid' : 'network'); btn.disabled = false; }
    } catch {
      say('network');
      btn.disabled = false;
    }
  });
}
