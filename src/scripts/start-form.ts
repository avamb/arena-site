/**
 * Progressive enhancement for /start: without JS the form posts to the handler and gets a
 * redirect to /start/thanks. With JS we validate inline, submit with fetch and show the state.
 */
const form = document.getElementById('start-form') as HTMLFormElement | null;
if (form) {
  const errors = JSON.parse(form.dataset.errors ?? '{}') as Record<string, string>;
  const status = form.querySelector<HTMLElement>('.form-status')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const sendingLabel = form.dataset.sending ?? '';
  const idleLabel = submit.textContent ?? '';

  type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  function setError(field: Field, message: string) {
    const wrap = field.closest<HTMLElement>('.field');
    if (!wrap) return;
    const err = wrap.querySelector<HTMLElement>('.err');
    if (message) { wrap.dataset.invalid = 'true'; if (err) err.textContent = message; }
    else { delete wrap.dataset.invalid; if (err) err.textContent = ''; }
  }

  /** A plausible phone number: optional +, then 7 to 15 digits with spaces, dots, dashes or brackets between them. */
  const phoneOk = (v: string) => /^[+]?[0-9 ().-]+$/.test(v) && v.replace(/[^0-9]/g, '').length >= 7 && v.replace(/[^0-9]/g, '').length <= 15;
  function validate(): boolean {
    let ok = true;
    (Array.from(form!.querySelectorAll('[required]')) as Field[]).forEach((el) => {
      const value = el.value.trim();
      let message = '';
      if (!value) message = errors.required;
      else if (el instanceof HTMLInputElement && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = errors.email;
      else if (el instanceof HTMLInputElement && el.type === 'tel' && !phoneOk(value)) message = errors.phone;
      setError(el, message);
      if (message && ok) { ok = false; el.focus(); }
    });
    return ok;
  }

  (Array.from(form.querySelectorAll('[required]')) as Field[]).forEach((el) => el.addEventListener('input', () => setError(el, '')));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.dataset.state = '';
    status.textContent = '';
    if (!validate()) return;
    const data = new FormData(form);
    submit.disabled = true;
    submit.textContent = sendingLabel;
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; redirect?: string; fields?: Record<string, string> };
      if (res.ok && json.ok) {
        window.location.href = json.redirect || (data.get('redirect') as string) || '/start/thanks';
        return;
      }
      if (json.error === 'validation' && json.fields) {
        // The server re-checks the fields; show its verdict next to the field, first invalid field focused.
        let focused = false;
        for (const [name, code] of Object.entries(json.fields)) {
          const el = form.elements.namedItem(name) as Field | null;
          if (!el) continue;
          setError(el, errors[code] ?? errors.required);
          if (!focused) { el.focus(); focused = true; }
        }
        return;
      }
      status.dataset.state = 'error';
      status.textContent = json.error === 'turnstile' ? errors.turnstile : errors.server;
      const w = (window as unknown as { turnstile?: { reset: () => void } }).turnstile;
      if (w) w.reset();
    } catch {
      status.dataset.state = 'error';
      status.textContent = errors.server;
    } finally {
      submit.disabled = false;
      submit.textContent = idleLabel;
    }
  });
}
