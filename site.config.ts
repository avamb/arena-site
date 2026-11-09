/**
 * Site-wide configuration. One place for languages (doc 33 §3.6), hosts, indexing and
 * third-party ids. Adding a language = one entry in `languages` + a `content/<code>/` folder.
 * Nothing here is secret.
 */

export type LanguageCode = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' | 'pl' | 'uk' | 'ru' | 'cs' | 'no';

export interface Language {
  code: LanguageCode;
  /** Name in the language itself, for the switcher. */
  name: string;
  dir: 'ltr' | 'rtl';
  /** Locale for Intl (dates, numbers, currencies). */
  intl: string;
  /** Shown in the language menu. Languages without content stay hidden until they have it. */
  inMenu: boolean;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', dir: 'ltr', intl: 'en-GB', inMenu: true },
  // Wave 1 of the translation, in the menu since 09.11.2026 (owner's decision, before a native read).
  { code: 'es', name: 'Español', dir: 'ltr', intl: 'es-ES', inMenu: true },
  { code: 'pt', name: 'Português', dir: 'ltr', intl: 'pt-BR', inMenu: true },
  { code: 'de', name: 'Deutsch', dir: 'ltr', intl: 'de-DE', inMenu: true },
  { code: 'fr', name: 'Français', dir: 'ltr', intl: 'fr-FR', inMenu: true },
  { code: 'it', name: 'Italiano', dir: 'ltr', intl: 'it-IT', inMenu: true },
  { code: 'pl', name: 'Polski', dir: 'ltr', intl: 'pl-PL', inMenu: true },
  { code: 'uk', name: 'Українська', dir: 'ltr', intl: 'uk-UA', inMenu: true },
  { code: 'ru', name: 'Русский', dir: 'ltr', intl: 'ru-RU', inMenu: true },
  { code: 'cs', name: 'Čeština', dir: 'ltr', intl: 'cs-CZ', inMenu: false },
  /** Only one archive article exists in Norwegian; the language stays out of the menu. */
  { code: 'no', name: 'Norsk', dir: 'ltr', intl: 'nb-NO', inMenu: false },
];

export const defaultLanguage: LanguageCode = 'en';

/**

 * everything, every page carries `noindex`, `_headers` adds X-Robots-Tag. Flip to `true` on
 * launch day together with the custom-domain switch. Can be overridden by SITE_INDEXING=true/false
 * at build time (CI uses it for the launch build).
 */
const envIndexing = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SITE_INDEXING;
export const indexing: boolean = envIndexing !== undefined ? envIndexing === 'true' : true;

/** Public origin of this build. The same code serves new., apex and the nginx container. */
export const siteUrl: string = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SITE_URL ?? 'https://arenasoldout.com';

export const org = {
  name: 'ArenaSoldOut.com',
  legalName: 'ABH TEAM OÜ',
  foundingYear: 2019,
  region: 'EU',
  sameAs: ['https://t.me/ArenaSoldOutChat'],
  contactEmail: 'hello@arenasoldout.com',
  logo: '/brand/arena-logo.svg',
};

export const hosts = {
  app: 'https://app.arenasoldout.com',
  tickets: 'https://tickets.arenasoldout.com',
  api: 'https://api.arenasoldout.com',
  widget: 'https://tickets.arenasoldout.com/widget/v1/arena-tickets.js',
  telegramBot: 'https://t.me/EventsCentrBot',
  telegramChat: 'https://t.me/ArenaSoldOutChat',
};

/** Umami (https://app.pr-top.com); empty values disable the script. The website id is public by design. */
export const umami = {
  src: 'https://app.pr-top.com/script.js',
  websiteId: '66156eeb-85a9-461f-a89c-49b1116ba31b',
};

/**
 * Own product analytics (spec 50, stage A2). `endpoint` is the collector URL, for example
 * `https://api.arenasoldout.com/v1/t`, set at build time through ANALYTICS_ENDPOINT. Empty (the default)
 * means the tracker, the consent banner and the footer link do not exist and nothing is ever sent.
 * The API origin must also list this site in its CORS_ALLOWED_ORIGINS; the CSP `connect-src` follows
 * the endpoint automatically (scripts/build-edge.mjs).
 */
export const analytics = {
  endpoint: ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ANALYTICS_ENDPOINT ?? '').trim(),
};

/**
 * Turnstile site key is public by design (it is embedded in the HTML). The secret lives only
 * in `wrangler secret` / the container environment as TURNSTILE_SECRET_KEY. Empty = widget off.
 */
export const turnstileSiteKey: string = '0x4AAAAAAFRfZMQDu7dPl6Rk'; // widget "arena-site forms": arenasoldout.com, new.arenasoldout.com, localhost

/**
 * Turnstile widget of the application form. The platform verifies the token with ITS secret
 * (ONBOARDING_TURNSTILE_SECRET), so the secret must belong to the widget whose site key is here.
 * Until a dedicated "arena onboarding" widget exists this is the site's forms widget.
 */
export const onboardingTurnstileSiteKey: string = turnstileSiteKey;

/** AI crawlers explicitly allowed in robots.txt (doc 33 §3.10, item 9). Review quarterly. */
export const allowedAgents = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Googlebot',
  'Bingbot',
  'Applebot-Extended',
  'CCBot',
];
