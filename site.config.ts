/**
 * Site-wide configuration. One place for languages (doc 33 §3.6), hosts, indexing and
 * third-party ids. Adding a language = one entry in `languages` + a `content/<code>/` folder.
 * Nothing here is secret.
 */

export type LanguageCode = 'en' | 'es' | 'cs' | 'ru' | 'no';

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
  { code: 'es', name: 'Español', dir: 'ltr', intl: 'es-ES', inMenu: false },
  { code: 'cs', name: 'Čeština', dir: 'ltr', intl: 'cs-CZ', inMenu: false },
  { code: 'ru', name: 'Русский', dir: 'ltr', intl: 'ru-RU', inMenu: false },
  /** Only one archive article exists in Norwegian; the language stays out of the menu. */
  { code: 'no', name: 'Norsk', dir: 'ltr', intl: 'nb-NO', inMenu: false },
];

export const defaultLanguage: LanguageCode = 'en';

/**
 * Indexing switch (doc 33 §3.7b, §3.10). `false` on new.arenasoldout.com: robots.txt disallows
 * everything, every page carries `noindex`, `_headers` adds X-Robots-Tag. Flip to `true` on
 * launch day together with the custom-domain switch. Can be overridden by SITE_INDEXING=true/false
 * at build time (CI uses it for the launch build).
 */
const envIndexing = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SITE_INDEXING;
export const indexing: boolean = envIndexing !== undefined ? envIndexing === 'true' : false;

/** Public origin of this build. The same code serves new., apex and the nginx container. */
export const siteUrl: string = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SITE_URL ?? 'https://new.arenasoldout.com';

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

/** Umami is self-hosted on lead-parser and not up yet; empty values disable the script. */
export const umami = {
  src: '',
  websiteId: '',
};

/**
 * Turnstile site key is public by design (it is embedded in the HTML). The secret lives only
 * in `wrangler secret` / the container environment as TURNSTILE_SECRET_KEY. Empty = widget off.
 */
export const turnstileSiteKey: string = '0x4AAAAAAFRfZMQDu7dPl6Rk'; // widget "arena-site forms": arenasoldout.com, new.arenasoldout.com, localhost

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
