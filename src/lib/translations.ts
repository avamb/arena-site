/**
 * Genuine translations only (SEO-003b). hreflang is emitted solely for pages listed here, never by
 * swapping the language prefix: most posts exist in one language, and an alternate that is not the
 * same page is worse than none. A pair is added only after the two texts were compared (structure,
 * length, figures). Left out on purpose until an editor decides: make-own-ticketing-platform-for-1000-usd
 * (two Russian candidates), platform-as-a-service-paas, the-essential-functionality-of-a-ticket-system.
 * Every entry is checked by scripts/check-hreflang.mjs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { languages, defaultLanguage, type LanguageCode } from '@config';

/** [English post slug, Russian post slug] */
export const postPairs: [string, string][] = [
  ['arenasoldout-com-applications-a-brief-guide', 'prilozheniya-arenasoldout-com-kratkij-gajd'],
  ['boosting-event-sales-innovative-moves-with-arenasoldout-com', 'increasing-sales-at-events-innovative-steps-with-arenasoldout-com'],
  ['custom-ticketing-platform-how-to-build-your-own', 'sobstvennaya-biletnaya-platforma-kak-ee-sozdat'],
  ['customer-database-key-asset-for-event-organizers-on-ticketing-platforms', 'baza-pokupatelej-klyuchevoj-aktiv-organizatorov-meropriyatij-na-biletnyh-platformah'],
  ['defense-against-bot-activities-and-bulk-reservations', 'zashhita-ot-botov-i-massovogo-bronirovaniya'],
  ['direct-sales-vs-ticket-operators', 'pryamye-prodazhi-vs-biletnye-operatory'],
  ['empowering-organizers-the-game-changing-shift-towards-direct-revenue-access', 'organizatory-meropriyatij-v-czentre-sobytij-blestyashhij-perehod-k-pryamomu-dostupu-k-vyruchke'],
  ['how-to-create-a-website-for-ticket-sales-concerts-cinemas-theaters-ticket-services-exhibitions-museums-tours-excursions-goods-boat-tours-and-parks', 'sozdanie-sajtov-dlya-prodazhi-biletov-turov-ekskursij-tovarov-i-uslug'],
  ['how-to-effectively-attract-buyers-using-time-scarcity', 'kak-effektivno-privlekat-pokupatelej-s-pomoshhyu-deficzita-vremeni'],
  ['how-to-turn-merchandise-into-a-powerful-promotion-and-revenue-tool-a-guide-for-event-organizers', 'kak-prevratit-merch-v-instrument-prodvizheniya-i-uvelicheniya-dohoda-gid-dlya-organizatorov-meropriyatij'],
  ['i-want-my-own-website-for-selling-tickets', 'my-own-site-for-tickets-sold'],
  ['increasing-event-sales-effective-strategies-with-agents-and-partners', 'uvelichenie-prodazh-meropriyatij-effektivnye-strategii-podklyucheniya-agentov-i-partnerov'],
  ['increasing-ticket-sales-guide-for-event-organizers', 'kak-uvelichivat-prodazhi-biletov-rukovodstvo-dlya-organizatorov-meropriyatij'],
  ['into-the-future-tour-sales-automation-exploring-new-frontiers-in-the-travel-industry', 'vpered-v-budushhee-avtomatizacziya-prodazh-turov-novye-gorizonty-v-industrii-puteshestvij'],
  ['mastering-ticket-sales-a-guide-to-building-your-ticketing-website', 'kak-nachat-prodavat-bilety-na-svoem-sajte-poshagovyj-gajd'],
  ['selling-tour-tickets', 'release-of-excursions-for-sale-methods-tools-step-by-step-instructions'],
  ['service-fees-in-ticket-sales-size-matters', 'servisnyj-sbor-v-prodazhe-biletov-razmer-imeet-znachenie'],
  ['ticket-service-fee-cost-and-customer-loyalty-management', 'servisnyj-sbor-pri-prodazhe-biletov-upravlenie-stoimostyu-i-loyalnostyu-pokupatelej'],
  ['stress-testing-technical-report', 'stress-testing-ru'],
  ['the-evolution-of-event-technologies-pioneering-new-frontiers-for-event-organizers', 'evolyucziya-tehnologij-na-sczene-sobytij-novye-gorizonty-dlya-organizatorov-meropriyatij'],
  ['the-money-saving-blueprint-for-event-organizers-unlocking-additional-earnings', 'the-ultimate-guide-how-event-organizers-can-save-and-earn-more'],
  ['ticket-platform-vs-ticket-system-understanding-the-difference-2', 'chem-biletnaya-platforma-otlichaetsya-ot-biletnoj-sistemy'],
  ['ticket-platforms-five-generations', 'the-evolution-of-ticket-platforms-five-generations'],
  ['ticket-platforms-key-features-for-organizers-of-top-events', 'biletnye-platformy-klyuchevye-funkczii-dlya-organizatorov-topovyh-sobytij-2'],
  ['ticketingsystemsadvantagesarenasoldout', 'ticketingsystemsadvantagesarenasoldoutru'],
  ['tools-for-events-from-5000-to-100k-participants-functional-features-of-ticketing-platforms', 'instrumenty-dlya-meropriyatij-ot-5-000-do-100k-uchastnikov-funkczionalnye-osobennosti-biletnyh-platform'],
  ['why-stress-testing-ticket-platforms-matters-benefits-for-organizers-and-buyers', 'why-the-tickets-platform-need-pay-load-tests-ru'],
];

/** Non-post pages that exist in both languages, as English path to Russian path. */
export const pagePairs: [string, string][] = [['/blog', '/ru/blog']];

/**
 * Languages a site page is limited to (`languages:` in the English original), or null when it is in every language.
 * Read from the file directly so the header and the route list agree without loading collections.
 */
export function pageLanguages(slug: string): string[] | null {
  const file = new URL(`../../content/${defaultLanguage}/pages/${slug}.yaml`, import.meta.url);
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/^languages:\s*\[([^\]]*)\]/m);
  return m ? m[1].split(',').map((x) => x.trim()).filter(Boolean) : null;
}

/** Slug of a site path in any language: `/ru/countries/israel` → `countries/israel`, `/` → `home`. */
export function slugOfPath(path: string): string {
  const prefix = languages.find((l) => l.code !== defaultLanguage && (path === `/${l.code}` || path.startsWith(`/${l.code}/`)));
  const rest = prefix ? path.slice(prefix.code.length + 1) || '/' : path;
  return rest === '/' ? 'home' : rest.replace(/\/$/, '').slice(1);
}

/** Every address of the same page across languages, or [] when the page has no translation. */
export function translationsOf(path: string): { lang: LanguageCode; path: string }[] {
  const norm = path.length > 1 ? path.replace(/\/$/, '') : path;
  const all = [...pagePairs, ...postPairs.map(([en, ru]) => [`/blog/${en}`, `/ru/blog/${ru}`] as [string, string])];
  const hit = all.find(([en, ru]) => en === norm || ru === norm);
  if (hit) return [{ lang: 'en', path: hit[0] }, { lang: 'ru', path: hit[1] }];
  return pageTranslations(norm);
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
