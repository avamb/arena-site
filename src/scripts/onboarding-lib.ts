/**
 * Pure helpers of the application form (/start, /start/continue, /start/confirm): types of the
 * platform's `form-schema`, value coercion, error mapping. No DOM here, so node:test can run it.
 * Contract: arena_new/08_architecture/34_onboarding_applications_ru.md §9 and appendix A.
 */

export type Option = { value: string; label: string };
export type Field = {
  key: string;
  type: string;
  label: string;
  hint?: string;
  required: boolean;
  read_only?: boolean;
  max_length?: number;
  max_items?: number;
  default_from?: string;
  options?: Option[];
};
export type Step = { key: string; title: string; fields: Field[] };
export type Schema = { steps: Step[]; accepted_countries: string[]; terms_version: string | number; privacy_version: string | number };
export type Answers = Record<string, unknown>;
export type Application = {
  id: string;
  status: string;
  email: string;
  email_confirmed: boolean;
  current_step: string;
  progress: number;
  answers: Answers;
  missing_fields: string[];
  requested_fields: string[];
  info_request_message?: string;
};

/** Statuses in which the applicant may still edit and (re)send the form. */
export const EDITABLE = ['draft', 'info_requested'];

/** ISO 3166-1 alpha-2 codes; names come from Intl.DisplayNames in the page language. */
export const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GI GM GN GQ GR GT GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VN WS XK YE ZA ZM ZW'.split(' ');

/** Currencies shown first; the rest of the list comes from Intl. */
export const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CZK', 'PLN', 'ILS', 'CHF', 'RSD', 'GEL', 'RON', 'HUF', 'BGN', 'RUB', 'UAH', 'TRY', 'MXN', 'BRL', 'ARS', 'COP', 'CLP'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const emailOk = (v: string) => EMAIL_RE.test(v.trim());
/** E.164-ish: optional +, 7 to 15 digits, common separators allowed. */
export function phoneOk(v: string): boolean {
  const s = v.trim();
  const digits = s.replace(/[^0-9]/g, '');
  return /^[+]?[0-9 ().-]+$/.test(s) && digits.length >= 7 && digits.length <= 15;
}

/** "Step {n}" style templates. */
export const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** The form's value for a field → the JSON value the API takes. `undefined` = send nothing. */
export function coerce(f: Field, raw: string | boolean | string[]): unknown {
  switch (f.type) {
    case 'bool':
      return raw === true;
    case 'multiselect':
      return Array.isArray(raw) ? raw : [];
    case 'url_list': {
      const list = String(raw).split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
      return list.slice(0, f.max_items ?? 5);
    }
    case 'number': {
      const s = String(raw).trim().replace(',', '.');
      if (!s) return '';
      const n = Number(s);
      return Number.isFinite(n) ? n : s;
    }
    default:
      return typeof raw === 'string' ? raw.trim() : raw;
  }
}

/** Where the API wraps a failure: `{error:{code, message, details:{fields:{key: reason}}}}`. */
export type ApiFailure = { status: number; code: string; fields: Record<string, string> };

export function parseFailure(status: number, body: unknown): ApiFailure {
  const e = (body as { error?: { code?: string; details?: { fields?: unknown } } } | null)?.error;
  const raw = e?.details?.fields;
  const fields: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const k of raw) if (typeof k === 'string') fields[k] = 'required';
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) fields[k] = typeof v === 'string' ? v : 'invalid';
  }
  return { status, code: e?.code ?? `http.${status}`, fields };
}

/** Message for a per-field reason (`required`, `invalid`, `too_long`, `not_allowed`). */
export function fieldMessage(reason: string, ui: Record<string, string>): string {
  return ui[`err_${reason}`] ?? ui.err_invalid ?? '';
}

/** Message for a whole-request error code. */
export function failureMessage(code: string, ui: Record<string, string>): string {
  const key = 'e_' + code.replace(/^onboarding\./, '').replace(/\W+/g, '_');
  return ui[key] ?? ui.e_generic ?? '';
}

/** UTM parameters and the referrer host: the only attribution sent, never personal data. */
export function collectUtm(search: string, referrer: string): Record<string, string> {
  const out: Record<string, string> = {};
  const p = new URLSearchParams(search);
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = p.get(k);
    if (v) out[k] = v.slice(0, 100);
  }
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host && !host.endsWith('arenasoldout.com')) out.referrer = host.slice(0, 100);
    } catch { /* not a URL */ }
  }
  return out;
}

/** Index of the first step that holds one of the given field keys, or -1. */
export function stepOfField(steps: Step[], keys: string[]): number {
  return steps.findIndex((s) => s.fields.some((f) => keys.includes(f.key)));
}

/** Countries for the select: the platform's list when it names any, otherwise all. */
export function countryOptions(accepted: string[], lang: string): Option[] {
  const codes = accepted.length ? accepted.map((c) => c.toUpperCase()) : COUNTRY_CODES;
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([lang], { type: 'region' }); } catch { names = null; }
  const label = (c: string) => { try { return names?.of(c) || c; } catch { return c; } };
  return codes.map((c) => ({ value: c, label: label(c) })).sort((a, b) => a.label.localeCompare(b.label, lang));
}

export function currencyOptions(lang: string): Option[] {
  let all: string[] = [];
  try { all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency') ?? []; } catch { all = []; }
  const codes = [...COMMON_CURRENCIES, ...all.filter((c) => !COMMON_CURRENCIES.includes(c))];
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([lang], { type: 'currency' }); } catch { names = null; }
  return codes.map((c) => ({ value: c, label: `${c}${names ? ' · ' + (names.of(c) ?? '') : ''}` }));
}
