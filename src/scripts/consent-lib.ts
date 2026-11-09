/**
 * Pure helpers of the consent and the visitor cookie (spec 50, section 3): names, lifetimes, parsing,
 * the contact code of an e-mail link. No DOM, no tracker; shared by analytics.ts and the application form.
 */
export const CONSENT_COOKIE = 'aso_consent';
export const AID_COOKIE = 'aso_aid';
/** Six months (the choice is asked again after that). */
export const CONSENT_MAX_AGE = 183 * 24 * 3600;
/** Thirteen months, the longest a visitor id may live. Never extended by a later visit. */
export const AID_MAX_AGE = 395 * 24 * 3600;

export type Choice = 'granted' | 'denied' | null;

const CID_RE = /^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/;
export const AID_RE = /^[A-Za-z0-9_-]{8,40}$/;
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function cookieLine(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function readChoice(cookieHeader: string): Choice {
  const v = parseCookies(cookieHeader)[CONSENT_COOKIE];
  return v === '1' ? 'granted' : v === '0' ? 'denied' : null;
}

/** The contact code of an e-mail link, or null when the query has none or it has the wrong shape. */
export function readCid(search: string): string | null {
  const v = new URLSearchParams(search).get('cid');
  return v !== null && CID_RE.test(v) ? v : null;
}

/**
 * The same address without `cid` (other parameters and the hash are kept), relative to the origin; null
 * when the query holds no `cid` at all. A malformed `cid` is removed too: it would only be forwarded.
 */
export function withoutCid(pathname: string, search: string, hash: string): string | null {
  const p = new URLSearchParams(search);
  if (!p.has('cid')) return null;
  p.delete('cid');
  const q = p.toString();
  return pathname + (q ? `?${q}` : '') + hash;
}

/** `a_` plus 24 characters of base64url: 144 random bits, inside the collector's 8-40 character rule. */
export function newAid(random: (n: number) => Uint8Array): string {
  let out = 'a_';
  for (const b of random(24)) out += B64URL[b & 63];
  return out;
}

/** The visitor id, only while the visitor has consented and the cookie holds a well-formed value. */
export function consentedAid(cookieHeader: string): string | null {
  if (readChoice(cookieHeader) !== 'granted') return null;
  const v = parseCookies(cookieHeader)[AID_COOKIE];
  return v !== undefined && AID_RE.test(v) ? v : null;
}
