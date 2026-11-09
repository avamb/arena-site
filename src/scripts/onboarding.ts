/**
 * The organizer application, client side (doc 34 §9). One script for three pages:
 *   apply    /start          contact → create the draft → step by step from the platform's form-schema → submit
 *   continue /start/continue e-mail → a fresh link to the open draft (always answers "sent")
 *   confirm  /start/confirm  token from the e-mail → confirms the address, stores the new access token, goes on
 * Requests go from the browser straight to the platform API; Turnstile is verified by the platform.
 * The access token lives in localStorage; analytics events carry step names only, never answers.
 */
import {
  EDITABLE, coerce, collectUtm, countryOptions, currencyOptions, emailOk, failureMessage, fieldMessage, fill,
  parseFailure, phoneOk, stepOfField,
  type Answers, type ApiFailure, type Application, type Field, type Schema, type Step,
} from './onboarding-lib';
import { consentedAid } from './consent-lib';

const root = document.getElementById('onb');
if (root) void main(root);

type Ui = Record<string, string>;
type Saved = { id: string; token: string };
const KEY = 'aso_onboarding';

function readSaved(): Saved | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && v.id && v.token ? v : null; } catch { return null; }
}
function writeSaved(v: Saved | null) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* private mode: the form still works until reload */ }
}

function track(name: string, data?: Record<string, string | number>) {
  const u = (window as unknown as { umami?: { track?: (n: string, d?: unknown) => void } }).umami;
  try { u?.track?.(name, data); } catch { /* analytics never blocks the form */ }
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const k of kids) if (k) el.append(k);
  return el;
}

async function main(el: HTMLElement) {
  const mode = el.dataset.mode ?? 'apply';
  const api = (el.dataset.api ?? '').replace(/\/$/, '');
  const lang = el.dataset.lang ?? 'en';
  const siteKey = el.dataset.sitekey ?? '';
  const ui = JSON.parse(el.dataset.ui ?? '{}') as Ui;
  const paths = JSON.parse(el.dataset.paths ?? '{}') as Record<string, string>;
  const mount = h('div', { class: 'onb-body' });
  el.replaceChildren(mount);

  /** One API call. Never throws: a network failure is `{status: 0, code: 'network'}`. */
  async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<{ ok: true; data: T } | { ok: false; err: ApiFailure }> {
    try {
      const res = await fetch(api + path, {
        method,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Onboarding-Token': token } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return { ok: true, data: json as T };
      return { ok: false, err: parseFailure(res.status, json) };
    } catch {
      return { ok: false, err: { status: 0, code: 'network', fields: {} } };
    }
  }

  /** Visitor id for the analytics join (spec 50, section 3): sent only while the visitor has accepted analytics. */
  function startAid(): { aid?: string } {
    try { const aid = consentedAid(document.cookie); return aid ? { aid } : {}; } catch { return {}; }
  }

  // ---- Turnstile ---------------------------------------------------------------------------------
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
  type Ts = { render: (c: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  function captcha(): { box: HTMLElement; token: () => string; reset: () => void } {
    const box = h('div', { class: 'cf-turnstile-box' });
    let token = '';
    let widget = '';
    if (siteKey) {
      void loadTurnstile().then(() => {
        const ts = (window as unknown as { turnstile?: Ts }).turnstile;
        if (!ts) return;
        widget = ts.render(box, { sitekey: siteKey, size: 'flexible', callback: (t: string) => { token = t; }, 'expired-callback': () => { token = ''; }, 'error-callback': () => { token = ''; } });
      });
    }
    return {
      box,
      token: () => token,
      reset: () => { token = ''; (window as unknown as { turnstile?: Ts }).turnstile?.reset(widget || undefined); },
    };
  }

  // ---- widgets -----------------------------------------------------------------------------------
  let schema: Schema | null = null;
  const fieldId = (k: string) => `onb-${k}`;

  function optionList(f: Field): { value: string; label: string }[] {
    if (f.type === 'country') return countryOptions(schema?.accepted_countries ?? [], lang);
    if (f.type === 'currency') return currencyOptions(lang);
    return f.options ?? [];
  }

  function widget(f: Field, value: unknown, forceEditable: boolean): { node: HTMLElement; read: () => string | boolean | string[]; input: HTMLElement } {
    const id = fieldId(f.key);
    const ro = !!f.read_only && !forceEditable;
    const common: Record<string, string> = { id, name: f.key };
    if (f.required) common['aria-required'] = 'true';
    if (f.max_length) common.maxlength = String(f.max_length);
    const text = (type: string, extra: Record<string, string> = {}) => {
      const i = h('input', { ...common, type, ...extra });
      i.value = value == null ? '' : String(value);
      if (ro) i.readOnly = true;
      return { input: i as HTMLElement, read: () => i.value };
    };
    let built: { input: HTMLElement; read: () => string | boolean | string[] };
    switch (f.type) {
      case 'email': built = text('email', { autocomplete: 'email', inputmode: 'email' }); break;
      case 'phone': built = text('tel', { autocomplete: 'tel', inputmode: 'tel' }); break;
      case 'url': built = text('url', { inputmode: 'url', placeholder: 'https://' }); break;
      case 'number': built = text('text', { inputmode: 'decimal' }); break;
      case 'date': built = text('date'); break;
      case 'textarea': {
        const t = h('textarea', { ...common, rows: '4' });
        t.value = value == null ? '' : String(value);
        built = { input: t, read: () => t.value };
        break;
      }
      case 'url_list': {
        const t = h('textarea', { ...common, rows: '3', placeholder: ui.url_list_hint ?? '' });
        t.value = Array.isArray(value) ? value.join('\n') : '';
        built = { input: t, read: () => t.value };
        break;
      }
      case 'select': case 'country': case 'currency': {
        const s = h('select', common);
        s.append(h('option', { value: '' }, ''));
        for (const o of optionList(f)) s.append(h('option', { value: o.value }, o.label));
        s.value = value == null ? '' : String(value);
        built = { input: s, read: () => s.value };
        break;
      }
      case 'multiselect': {
        const chosen = new Set(Array.isArray(value) ? (value as string[]) : []);
        const wrap = h('div', { class: 'onb-checks', role: 'group', 'aria-labelledby': id + '-l' });
        const boxes = (f.options ?? []).map((o) => {
          const c = h('input', { type: 'checkbox', value: o.value });
          c.checked = chosen.has(o.value);
          wrap.append(h('label', { class: 'onb-check' }, c, h('span', {}, o.label)));
          return c;
        });
        built = { input: wrap, read: () => boxes.filter((b) => b.checked).map((b) => b.value) };
        break;
      }
      case 'bool': {
        const c = h('input', { type: 'checkbox', id, name: f.key });
        c.checked = value === true;
        built = { input: c, read: () => c.checked };
        break;
      }
      default: built = text('text', f.key === 'first_name' ? { autocomplete: 'given-name' } : f.key === 'last_name' ? { autocomplete: 'family-name' } : f.key === 'org_name' ? { autocomplete: 'organization' } : {});
    }
    const err = h('span', { class: 'err', id: id + '-e', role: 'alert' });
    const hint = f.hint ? h('span', { class: 'hint' }, f.hint) : null;
    const opt = f.required || f.type === 'bool' ? '' : ` ${ui.optional ?? ''}`;
    let node: HTMLElement;
    if (f.type === 'bool') {
      node = h('div', { class: 'field field-bool' }, h('label', { class: 'onb-check', for: id }, built.input, h('span', {}, f.label)), hint, err);
    } else {
      node = h('div', { class: 'field' }, h('label', { for: id, id: id + '-l' }, f.label + opt), built.input, hint, err);
    }
    node.dataset.key = f.key;
    return { node, read: built.read, input: built.input };
  }

  function showErrors(form: HTMLElement, fields: Record<string, string>): boolean {
    let focused = false;
    form.querySelectorAll<HTMLElement>('.field').forEach((w) => {
      const reason = fields[w.dataset.key ?? ''];
      const e = w.querySelector<HTMLElement>('.err');
      if (reason) {
        w.dataset.invalid = 'true';
        if (e) e.textContent = fieldMessage(reason, ui);
        const i = w.querySelector<HTMLElement>('input,select,textarea');
        if (i && !focused) { i.focus(); focused = true; }
      } else {
        delete w.dataset.invalid;
        if (e) e.textContent = '';
      }
    });
    return focused;
  }

  function status(form: HTMLElement): { set: (msg: string, state?: string) => void } {
    const p = h('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
    form.append(p);
    return { set: (msg, state = '') => { p.dataset.state = state; p.textContent = msg; } };
  }

  function busy(btn: HTMLButtonElement, on: boolean, idle: string) {
    btn.disabled = on;
    btn.textContent = on ? ui.sending ?? '…' : idle;
  }

  /** Client-side check of what the schema says is required, so a typo costs no round trip. */
  function localCheck(fields: Field[], values: Record<string, string | boolean | string[]>): Record<string, string> {
    const bad: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key];
      const empty = v === '' || v === false || (Array.isArray(v) && v.length === 0) || v === undefined;
      if (f.required && empty) { bad[f.key] = 'required'; continue; }
      if (typeof v === 'string' && v) {
        if (f.type === 'email' && !emailOk(v)) bad[f.key] = 'invalid';
        else if (f.type === 'phone' && !phoneOk(v)) bad[f.key] = 'invalid';
      }
    }
    return bad;
  }

  const goTo = (path: string) => { window.location.href = path; };

  // ============================== confirm ===========================================================
  if (mode === 'confirm') {
    const token = new URLSearchParams(location.search).get('token') ?? '';
    mount.append(h('p', { class: 'form-status', role: 'status' }, ui.confirming ?? ''));
    if (!token) return showConfirmFailure();
    const r = await call<{ application_id: string; access_token: string; application: Application }>('POST', '/v1/onboarding/confirm', { token });
    if (!r.ok) return showConfirmFailure();
    writeSaved({ id: r.data.application_id, token: r.data.access_token });
    track('onb_email_confirmed');
    history.replaceState(null, '', location.pathname); // the one-time token leaves the address bar
    mount.replaceChildren(
      h('p', { class: 'onb-ok' }, ui.confirmed ?? ''),
      h('p', {}, h('a', { class: 'btn btn-primary', href: paths.start ?? '/start' }, ui.go_on ?? '')),
    );
    return;
  }
  function showConfirmFailure() {
    mount.replaceChildren(
      h('p', { class: 'form-status', 'data-state': 'error' }, ui.confirm_failed ?? ''),
      h('p', {}, h('a', { class: 'btn btn-primary', href: paths.continue ?? '/start/continue' }, ui.send_new_link ?? '')),
    );
  }

  // ============================== continue ==========================================================
  if (mode === 'continue') {
    const cap = captcha();
    const email = h('input', { id: 'onb-email', name: 'email', type: 'email', required: '', autocomplete: 'email', inputmode: 'email' });
    const err = h('span', { class: 'err', role: 'alert' });
    const field = h('div', { class: 'field' }, h('label', { for: 'onb-email' }, ui.email ?? ''), email, err);
    const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, ui.send_link ?? '');
    const form = h('form', { class: 'form', novalidate: '' }, field, cap.box, h('div', { class: 'hero-actions' }, btn));
    const st = status(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      st.set('');
      if (!emailOk(email.value)) { field.dataset.invalid = 'true'; err.textContent = fieldMessage('invalid', ui); email.focus(); return; }
      delete field.dataset.invalid; err.textContent = '';
      if (siteKey && !cap.token()) { st.set(ui.e_turnstile_failed ?? '', 'error'); return; }
      busy(btn, true, ui.send_link ?? '');
      const r = await call('POST', '/v1/onboarding/resume', { email: email.value.trim(), turnstile_token: cap.token() });
      busy(btn, false, ui.send_link ?? '');
      cap.reset();
      if (r.ok) { track('onb_resume_requested'); st.set(ui.link_sent ?? '', 'success'); return; }
      st.set(failureMessage(r.err.code, ui), 'error');
    });
    mount.append(form);
    return;
  }

  // ============================== apply =============================================================
  const sc = await call<Schema>('GET', `/v1/onboarding/form-schema?locale=${encodeURIComponent(lang)}`);
  if (!sc.ok) { mount.append(h('p', { class: 'form-status', 'data-state': 'error' }, ui.e_unavailable ?? '')); return; }
  schema = sc.data;
  const steps = schema.steps;
  const contact = steps.find((s) => s.key === 'contact');
  const rest = steps.filter((s) => s.key !== 'contact');
  const total = rest.length + 1;

  let saved = readSaved();
  let app: Application | null = null;
  let stepIx = 0; // index in `rest`
  let finished = false;
  let reported = '';
  let abandonedAt = '';

  window.addEventListener('pagehide', () => { if (!finished && abandonedAt) track('onb_abandon', { step: abandonedAt }); });

  if (saved) {
    const r = await call<{ application: Application }>('GET', `/v1/onboarding/applications/${saved.id}`, undefined, saved.token);
    if (r.ok) {
      if (!EDITABLE.includes(r.data.application.status)) { finished = true; return goTo(paths.thanks ?? '/start/thanks'); }
      app = r.data.application;
      const i = rest.findIndex((s) => s.key === app!.current_step);
      stepIx = i >= 0 ? i : 0;
    } else { writeSaved(null); saved = null; }
  }

  const bar = h('div', { class: 'onb-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span', {}));
  const crumb = h('p', { class: 'onb-crumb' });
  const panel = h('div', { class: 'onb-panel' });
  mount.replaceChildren(crumb, bar, panel);

  function setProgress(n: number, name: string) {
    const pct = Math.round((n / total) * 100);
    (bar.firstElementChild as HTMLElement).style.width = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    crumb.textContent = `${fill(ui.step_of ?? '', { n, total })} · ${name}`;
  }

  function mark(step: string) {
    abandonedAt = step;
    if (reported !== step) { reported = step; track('onb_step_view', { step }); }
  }

  const known = (): Answers => app?.answers ?? {};

  // -- start (contact) --
  function renderStart() {
    if (!contact) return;
    setProgress(1, contact.title);
    mark('contact');
    const cap = captcha();
    const widgets = contact.fields.map((f) => widget(f, undefined, true));
    const hp = h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', {}, 'Website', h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' })));
    const btn = h('button', { class: 'btn btn-primary', type: 'submit', 'data-track': 'apply.submit' }, ui.start_button ?? '');
    const form = h('form', { class: 'form', novalidate: '' }, hp, ...widgets.map((w) => w.node), cap.box,
      h('p', { class: 'hint onb-note' }, ui.start_note ?? ''),
      h('div', { class: 'hero-actions' }, btn, h('a', { class: 'btn btn-ghost', href: paths.continue ?? '/start/continue' }, ui.have_draft ?? '')));
    const st = status(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      st.set('');
      const vals: Record<string, string | boolean | string[]> = {};
      contact.fields.forEach((f, i) => { vals[f.key] = widgets[i].read(); });
      const bad = localCheck(contact.fields, vals);
      if (Object.keys(bad).length) { showErrors(form, bad); return; }
      showErrors(form, {});
      if (siteKey && !cap.token()) { st.set(ui.e_turnstile_failed ?? '', 'error'); return; }
      busy(btn, true, ui.start_button ?? '');
      const honeypot = (form.querySelector<HTMLInputElement>('input[name=website]')?.value) ?? '';
      const r = await call<{ application_id: string; access_token: string }>('POST', '/v1/onboarding/applications', {
        first_name: String(vals.first_name ?? '').trim(), last_name: String(vals.last_name ?? '').trim(),
        email: String(vals.email ?? '').trim(), phone: String(vals.phone ?? '').trim(),
        locale: lang, source: 'site', turnstile_token: cap.token(), utm: collectUtm(location.search, document.referrer), honeypot,
        ...startAid(),
      });
      busy(btn, false, ui.start_button ?? '');
      cap.reset();
      if (!r.ok) {
        track('onb_error', { step: 'contact', code: r.err.code });
        if (Object.keys(r.err.fields).length) showErrors(form, r.err.fields);
        else st.set(failureMessage(r.err.code, ui), 'error');
        return;
      }
      saved = { id: r.data.application_id, token: r.data.access_token };
      writeSaved(saved);
      track('onb_started');
      // Telegram username is a contact-step answer the start call does not take; it rides on the first save.
      const extra = String(vals.telegram_username ?? '').trim();
      if (extra) await call('PUT', `/v1/onboarding/applications/${saved.id}/answers`, { answers: { telegram_username: extra } }, saved.token);
      const g = await call<{ application: Application }>('GET', `/v1/onboarding/applications/${saved.id}`, undefined, saved.token);
      app = g.ok ? g.data.application : null;
      stepIx = 0;
      renderStep(true);
    });
    panel.replaceChildren(form);
  }

  // -- one of the following steps --
  function renderStep(justStarted = false) {
    const step: Step = rest[stepIx];
    const last = stepIx === rest.length - 1;
    setProgress(stepIx + 2, step.title);
    mark(step.key);
    const answers = known();
    const widgets = step.fields.map((f) => {
      let v = answers[f.key];
      if ((v === undefined || v === '') && f.default_from) v = answers[f.default_from];
      return widget(f, v, false);
    });
    // A field with `default_from` (address country ← country of registration) follows its source until the person changes it.
    step.fields.forEach((f, i) => {
      const si = f.default_from ? step.fields.findIndex((x) => x.key === f.default_from) : -1;
      if (si < 0) return;
      const src = widgets[si].input as HTMLSelectElement | HTMLInputElement;
      const dst = widgets[i].input as HTMLSelectElement | HTMLInputElement;
      let followed = src.value;
      if (!dst.value && src.value) dst.value = src.value;
      src.addEventListener('change', () => { if (!dst.value || dst.value === followed) dst.value = src.value; followed = src.value; });
    });
    const back = h('button', { class: 'btn btn-ghost', type: 'button' }, ui.back ?? '');
    const next = h('button', { class: 'btn btn-primary', type: 'submit' }, last ? ui.submit ?? '' : ui.next ?? '');
    const intro: (HTMLElement | null)[] = [];
    if (justStarted) intro.push(h('p', { class: 'onb-ok' }, fill(ui.email_sent ?? '', { email: app?.email ?? '' })));
    if (app?.status === 'info_requested') {
      intro.push(h('p', { class: 'onb-ask' }, ui.info_requested ?? '', app.info_request_message ? h('span', {}, ' ' + app.info_request_message) : null));
    }
    const legal = step.key === 'consents'
      ? h('p', { class: 'hint onb-note' }, ui.legal_lead ?? '', ' ', h('a', { href: paths.terms ?? '/pricing/terms' }, ui.terms ?? ''), ' · ', h('a', { href: paths.privacy ?? '/legal/privacy' }, ui.privacy ?? ''))
      : null;
    const form = h('form', { class: 'form', novalidate: '' }, ...intro, h('h2', { class: 'onb-h' }, step.title), ...widgets.map((w) => w.node), legal,
      h('div', { class: 'hero-actions' }, back, next));
    const st = status(form);
    back.addEventListener('click', () => { if (stepIx > 0) { stepIx -= 1; renderStep(); } else { renderStart(); } });
    if (stepIx === 0) back.hidden = true;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      st.set('');
      if (!saved) return renderStart();
      const vals: Record<string, string | boolean | string[]> = {};
      const payload: Answers = {};
      step.fields.forEach((f, i) => { vals[f.key] = widgets[i].read(); payload[f.key] = coerce(f, vals[f.key]); });
      const bad = localCheck(step.fields, vals);
      if (Object.keys(bad).length) { showErrors(form, bad); return; }
      showErrors(form, {});
      busy(next, true, last ? ui.submit ?? '' : ui.next ?? '');
      const idle = last ? ui.submit ?? '' : ui.next ?? '';
      const put = await call<{ application: Application }>('PUT', `/v1/onboarding/applications/${saved.id}/answers`, { answers: payload }, saved.token);
      if (!put.ok) { busy(next, false, idle); return fail(put.err, form, st, step.key); }
      app = put.data.application;
      if (!last) { busy(next, false, idle); track('onb_step_done', { step: step.key }); stepIx += 1; renderStep(); return; }
      const sub = await call<{ application: Application }>('POST', `/v1/onboarding/applications/${saved.id}/submit`, undefined, saved.token);
      busy(next, false, idle);
      if (!sub.ok) return fail(sub.err, form, st, step.key);
      finished = true;
      track('onb_submitted');
      writeSaved(null);
      goTo(paths.thanks ?? '/start/thanks');
    });
    panel.replaceChildren(form);
    const first = panel.querySelector<HTMLElement>('input:not([readonly]),select,textarea');
    if (justStarted || stepIx > 0) first?.focus({ preventScroll: false });
  }

  function fail(err: ApiFailure, form: HTMLElement, st: { set: (m: string, s?: string) => void }, stepKey: string) {
    track('onb_error', { step: stepKey, code: err.code });
    if (err.status === 404 || err.status === 401) { writeSaved(null); saved = null; app = null; st.set(ui.e_session ?? '', 'error'); setTimeout(renderStart, 1500); return; }
    if (err.code === 'onboarding.locked') { finished = true; return goTo(paths.thanks ?? '/start/thanks'); }
    const keys = Object.keys(err.fields);
    if (keys.length) {
      const ix = stepOfField(rest, keys);
      if (ix >= 0 && ix !== stepIx) { stepIx = ix; renderStep(); showErrors(panel, err.fields); st.set(''); return; }
      showErrors(form, err.fields);
      st.set(err.code === 'onboarding.incomplete' ? ui.e_incomplete ?? '' : '', 'error');
      return;
    }
    st.set(failureMessage(err.code, ui), 'error');
  }

  if (app) renderStep(); else renderStart();
}
