/**
 * Genuine translations only (SEO-003b). hreflang is emitted solely for pages listed here, never by
 * swapping the language prefix: most posts exist in one language, and an alternate that is not the
 * same page is worse than none. A pair is added only after the two texts were compared (structure,
 * length, figures). Left out on purpose until an editor decides: make-own-ticketing-platform-for-1000-usd
 * (two Russian candidates), platform-as-a-service-paas, the-essential-functionality-of-a-ticket-system.
 * Every entry is checked by scripts/check-hreflang.mjs.
 *
 * A group is one article in several languages: language code to that language's post slug, one
 * group per line. A new article translated into es, de, ... gets one line with every language it
 * exists in, e.g. { en: 'ticket-fees-explained', es: 'cargos-venta-de-entradas', ru: '...' }.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { languages, defaultLanguage, type LanguageCode } from '@config';

export const postGroups: Partial<Record<LanguageCode, string>>[] = [
  { en: 'how-to-increase-event-revenue', es: 'como-aumentar-ingresos-evento', pt: 'como-aumentar-receita-evento', de: 'umsatz-veranstaltung-steigern', fr: 'augmenter-recettes-evenement', it: 'aumentare-incassi-evento', pl: 'jak-zwiekszyc-przychody-z-wydarzenia', uk: 'yak-zbilshyty-vyruchku-zakhodu', ru: 'kak-uvelichit-vyruchku-meropriyatiya' },
  { en: 'arenasoldout-com-applications-a-brief-guide', ru: 'prilozheniya-arenasoldout-com-kratkij-gajd' },
  { en: 'boosting-event-sales-innovative-moves-with-arenasoldout-com', ru: 'increasing-sales-at-events-innovative-steps-with-arenasoldout-com' },
  { en: 'custom-ticketing-platform-how-to-build-your-own', ru: 'sobstvennaya-biletnaya-platforma-kak-ee-sozdat' },
  { en: 'customer-database-key-asset-for-event-organizers-on-ticketing-platforms', ru: 'baza-pokupatelej-klyuchevoj-aktiv-organizatorov-meropriyatij-na-biletnyh-platformah' },
  { en: 'defense-against-bot-activities-and-bulk-reservations', ru: 'zashhita-ot-botov-i-massovogo-bronirovaniya' },
  { en: 'direct-sales-vs-ticket-operators', ru: 'pryamye-prodazhi-vs-biletnye-operatory' },
  { en: 'empowering-organizers-the-game-changing-shift-towards-direct-revenue-access', ru: 'organizatory-meropriyatij-v-czentre-sobytij-blestyashhij-perehod-k-pryamomu-dostupu-k-vyruchke' },
  { en: 'how-to-create-a-website-for-ticket-sales-concerts-cinemas-theaters-ticket-services-exhibitions-museums-tours-excursions-goods-boat-tours-and-parks', ru: 'sozdanie-sajtov-dlya-prodazhi-biletov-turov-ekskursij-tovarov-i-uslug' },
  { en: 'how-to-effectively-attract-buyers-using-time-scarcity', ru: 'kak-effektivno-privlekat-pokupatelej-s-pomoshhyu-deficzita-vremeni' },
  { en: 'how-to-turn-merchandise-into-a-powerful-promotion-and-revenue-tool-a-guide-for-event-organizers', ru: 'kak-prevratit-merch-v-instrument-prodvizheniya-i-uvelicheniya-dohoda-gid-dlya-organizatorov-meropriyatij' },
  { en: 'i-want-my-own-website-for-selling-tickets', ru: 'my-own-site-for-tickets-sold' },
  { en: 'increasing-event-sales-effective-strategies-with-agents-and-partners', ru: 'uvelichenie-prodazh-meropriyatij-effektivnye-strategii-podklyucheniya-agentov-i-partnerov' },
  { en: 'increasing-ticket-sales-guide-for-event-organizers', ru: 'kak-uvelichivat-prodazhi-biletov-rukovodstvo-dlya-organizatorov-meropriyatij' },
  { en: 'into-the-future-tour-sales-automation-exploring-new-frontiers-in-the-travel-industry', ru: 'vpered-v-budushhee-avtomatizacziya-prodazh-turov-novye-gorizonty-v-industrii-puteshestvij' },
  { en: 'mastering-ticket-sales-a-guide-to-building-your-ticketing-website', ru: 'kak-nachat-prodavat-bilety-na-svoem-sajte-poshagovyj-gajd' },
  { en: 'selling-tour-tickets', ru: 'release-of-excursions-for-sale-methods-tools-step-by-step-instructions' },
  { en: 'service-fees-in-ticket-sales-size-matters', ru: 'servisnyj-sbor-v-prodazhe-biletov-razmer-imeet-znachenie' },
  { en: 'ticket-service-fee-cost-and-customer-loyalty-management', ru: 'servisnyj-sbor-pri-prodazhe-biletov-upravlenie-stoimostyu-i-loyalnostyu-pokupatelej' },
  { en: 'stress-testing-technical-report', ru: 'stress-testing-ru' },
  { en: 'the-evolution-of-event-technologies-pioneering-new-frontiers-for-event-organizers', ru: 'evolyucziya-tehnologij-na-sczene-sobytij-novye-gorizonty-dlya-organizatorov-meropriyatij' },
  { en: 'the-money-saving-blueprint-for-event-organizers-unlocking-additional-earnings', ru: 'the-ultimate-guide-how-event-organizers-can-save-and-earn-more' },
  { en: 'ticket-platform-vs-ticket-system-understanding-the-difference-2', ru: 'chem-biletnaya-platforma-otlichaetsya-ot-biletnoj-sistemy' },
  { en: 'ticket-platforms-five-generations', ru: 'the-evolution-of-ticket-platforms-five-generations' },
  { en: 'ticket-platforms-key-features-for-organizers-of-top-events', ru: 'biletnye-platformy-klyuchevye-funkczii-dlya-organizatorov-topovyh-sobytij-2' },
  { en: 'ticketingsystemsadvantagesarenasoldout', ru: 'ticketingsystemsadvantagesarenasoldoutru' },
  { en: 'tools-for-events-from-5000-to-100k-participants-functional-features-of-ticketing-platforms', ru: 'instrumenty-dlya-meropriyatij-ot-5-000-do-100k-uchastnikov-funkczionalnye-osobennosti-biletnyh-platform' },
  { en: 'why-stress-testing-ticket-platforms-matters-benefits-for-organizers-and-buyers', ru: 'why-the-tickets-platform-need-pay-load-tests-ru' },
];

type Alternate = { lang: LanguageCode; path: string };

const prefixed = (lang: LanguageCode, rest: string) => (lang === defaultLanguage ? rest : `/${lang}${rest}`);

/** Every address of the same page across languages, or [] when the page has no translation. */
export function translationsOf(path: string): Alternate[] {
  const norm = path.length > 1 ? path.replace(/\/$/, '') : path;
  for (const group of postGroups) {
    const out = (Object.entries(group) as [LanguageCode, string][]).map(([lang, slug]) => ({ lang, path: prefixed(lang, `/blog/${slug}`) }));
    if (out.some((x) => x.path === norm)) return out.length > 1 ? out : [];
  }
  const blog = blogIndexes();
  if (blog.some((x) => x.path === norm)) return blog.length > 1 ? blog : [];
  return pageTranslations(norm);
}

/**
 * Blog indexes are alternates of each other only in languages that have at least one published post:
 * an index without posts is noindex (SEO session, 18.11.2026), and an alternate must be indexable.
 */
let blogCache: Alternate[] | undefined;
function blogIndexes(): Alternate[] {
  if (blogCache) return blogCache;
  const hasPosts = (code: string) => {
    const dir = new URL(`../../content/${code}/posts/`, import.meta.url);
    if (!existsSync(dir)) return false;
    return readdirSync(dir).some((f) => /\.mdx?$/.test(f) && !/^draft:\s*true\s*$/m.test(readFileSync(new URL(f, dir), 'utf8').split(/\r?\n---/)[0]));
  };
  blogCache = languages.filter((l) => l.inMenu && hasPosts(l.code)).map((l) => ({ lang: l.code, path: prefixed(l.code, '/blog') }));
  return blogCache;
}

/**
 * Site pages (content/<lang>/pages/*.yaml) translated from the English original, in the languages of
 * the menu (wave 1, 09.11.2026). Same slug in every language, so the alternates are certain.
 * Blog paths are left to the pairs above; the application steps under /start/ are noindex.
 */
function pageTranslations(path: string): { lang: LanguageCode; path: string }[] {
  const live = languages.filter((l) => l.inMenu);
  const prefix = live.find((l) => l.code !== defaultLanguage && (path === `/${l.code}` || path.startsWith(`/${l.code}/`)));
  const rest = prefix ? path.slice(prefix.code.length + 1) || '/' : path;
  const slug = rest === '/' ? 'home' : rest.slice(1);
  if (slug === 'blog' || slug.startsWith('blog/') || slug.startsWith('start/')) return [];
  const has = (code: string) => existsSync(new URL(`../../content/${code}/pages/${slug}.yaml`, import.meta.url));
  if (!has(defaultLanguage)) return [];
  const out = live.filter((l) => has(l.code)).map((l) => ({ lang: l.code, path: l.code === defaultLanguage ? rest : `/${l.code}${rest === '/' ? '' : rest}` }));
  return out.length > 1 ? out : [];
}
