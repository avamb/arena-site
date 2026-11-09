/**
 * "Contact the team" (doc 51 §1.3): opens the dialog from any [data-contact-open] link (the link itself
 * goes to /contact#write without JavaScript), loads Turnstile only when a form is shown, posts JSON to
 * /api/contact (worker/contact.ts). On /contact the inline form is used instead of the dialog.
 */
type Ts = { render: (c: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };

let tsLoading: Promise<void> | null = null;
const loadTurnstile = () => (tsLoading ??= new Promise<void>((resolve) => {
  if ((window as { turnstile?: unknown }).turnstile) return resolve();
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => resolve();
  document.head.append(s);
}));

function setup(form: HTMLFormElement) {
  if (form.dataset.ready) return;
  form.dataset.ready = '1';
  const errors = JSON.parse(form.dataset.errors ?? '{}') as Record<string, string>;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const box = form.querySelector<HTMLElement>('[data-turnstile]')!;
  const siteKey = form.dataset.sitekey ?? '';
  let token = '';
  let widget = '';
  const say = (text: string, state: 'error' | 'success' | '' = '') => { status.textContent = text; status.dataset.state = state; };
  if (siteKey) {
    void loadTurnstile().then(() => {
      const ts = (window as unknown as { turnstile?: Ts }).turnstile;
      if (!ts || widget) return;
      widget = ts.render(box, { sitekey: siteKey, size: 'flexible', language: form.dataset.lang, callback: (v: string) => { token = v; }, 'expired-callback': () => { token = ''; }, 'error-callback': () => { token = ''; } });
    });
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const bad = {
      name: !data.name?.trim(),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email?.trim() ?? ''),
      message: (data.message?.trim().length ?? 0) < 10,
    };
    for (const [k, v] of Object.entries(bad)) form.querySelector(`[name=${k}]`)?.closest('.field')?.toggleAttribute('data-invalid', v);
    if (Object.values(bad).some(Boolean)) { say(errors.invalid ?? '', 'error'); return; }
    if (siteKey && !token) { say(errors.turnstile ?? '', 'error'); return; }
    button.disabled = true;
    say(form.dataset.sending ?? '');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: form.dataset.lang, page: location.pathname, turnstile_token: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        form.reset();
        say((form.dataset.sent ?? '').replace('{email}', data.email.trim()), 'success');
      } else {
        say(errors[body.error ?? ''] ?? errors.unavailable ?? '', 'error');
      }
    } catch {
      say(errors.network ?? '', 'error');
    } finally {
      button.disabled = false;
      token = '';
      (window as unknown as { turnstile?: Ts }).turnstile?.reset(widget || undefined);
    }
  });
}

const dialog = document.getElementById('contact-dialog') as HTMLDialogElement | null;
const inline = document.getElementById('write');
document.querySelectorAll<HTMLFormElement>('#write [data-contact-form]').forEach(setup);

document.addEventListener('click', (e) => {
  const link = (e.target as Element).closest<HTMLAnchorElement>('[data-contact-open]');
  if (!link) return;
  if (inline) { e.preventDefault(); inline.scrollIntoView({ block: 'start' }); inline.querySelector<HTMLElement>('input')?.focus({ preventScroll: true }); return; }
  if (!dialog || typeof dialog.showModal !== 'function') return;
  e.preventDefault();
  const form = dialog.querySelector<HTMLFormElement>('[data-contact-form]');
  if (form) setup(form);
  dialog.showModal();
  dialog.querySelector<HTMLElement>('input')?.focus();
});
dialog?.addEventListener('click', (e) => {
  // A click on the backdrop (the dialog element itself, outside the panel) closes it.
  if (e.target === dialog || (e.target as Element).closest('[data-contact-close]')) dialog.close();
});
