/**
 * `data-track` labels for the key calls to action (spec 50, section 5: the label comes from code, never
 * from visitor input, `[a-z0-9_.-]`, at most 64 characters). The tracker reports a click only on an
 * element that carries the attribute, so a link that is not a key action simply gets none.
 * A label is `<action>.<place>`: `apply.hero`, `contact.pricing_venues`, `bot.cta`.
 */
export type TrackAction = 'apply' | 'contact' | 'demo' | 'pricing' | 'bot' | 'signin';

/** The action a link stands for, or undefined when it is not one of the key calls to action. */
export function trackAction(href: string | undefined): TrackAction | undefined {
  if (!href) return undefined;
  if (/^https:\/\/t\.me\/EventsCentrBot\b/i.test(href)) return 'bot';
  if (/^https?:\/\//i.test(href)) return /^https:\/\/app\.arenasoldout\.com\b/i.test(href) ? 'signin' : undefined;
  const path = href.replace(/[?#].*$/, '').replace(/^\/(?:ru|es|cs|no)(?=\/|$)/, '') || '/';
  if (path === '/start') return 'apply';
  if (path === '/contact') return 'contact';
  if (path === '/pricing') return 'pricing';
  if (/(^|\/)demo(\/|$)/.test(path)) return 'demo';
  return undefined;
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');

/** `data-track` value for a link in a place of the page, or undefined. */
export function trackLabel(href: string | undefined, place: string): string | undefined {
  const action = trackAction(href);
  return action ? `${action}.${clean(place)}`.slice(0, 64) : undefined;
}
