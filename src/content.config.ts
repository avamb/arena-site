/**
 * Content collections (doc 33 §3.8): every text lives in `content/`, every collection has a zod
 * schema that maps one to one onto an editor form (Keystatic later). Components never contain prose.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const link = z.object({ label: z.string(), href: z.string() });

/* ---------- Visuals used inside Q/A tiles (data, drawn by components) ---------- */
const ladderRung = z.object({ price: z.string(), width: z.number().min(0).max(100), label: z.string(), next: z.boolean().optional() });

const visual = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ladder'), rungs: z.array(ladderRung) }),
  z.object({
    type: z.literal('plan'),
    aria: z.string(),
    stage: z.string(),
    parterre: z.string(),
    logeLeft: z.string(),
    logeRight: z.string(),
    balcony: z.string(),
    standing: z.string(),
  }),
  z.object({ type: z.literal('ticket'), event: z.string(), meta: z.string(), seat: z.string(), code: z.string() }),
  z.object({ type: z.literal('telegram'), from: z.string(), lines: z.array(z.string()), time: z.string() }),
]);

/* ---------- Event center mock screens ---------- */
const ecScreen = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('orders'),
    aria: z.string(),
    title: z.string(),
    status: z.string(),
    meta: z.string(),
    columns: z.array(z.string()),
    rows: z.array(z.object({ order: z.string(), buyer: z.string(), seats: z.string(), total: z.string(), status: z.string(), tone: z.enum(['ok', 'warn', 'neutral']) })),
    actions: z.array(z.string()),
    caption: z.string(),
  }),
  z.object({
    kind: z.literal('refund'),
    aria: z.string(),
    title: z.string(),
    tag: z.string(),
    meta: z.string(),
    rows: z.array(z.object({ label: z.string(), value: z.string() })),
    primary: z.string(),
    secondary: z.string(),
    caption: z.string(),
  }),
  z.object({
    kind: z.literal('sales'),
    aria: z.string(),
    title: z.string(),
    meta: z.string(),
    rungs: z.array(ladderRung),
    rows: z.array(z.object({ label: z.string(), value: z.string() })),
    actions: z.array(z.string()),
    caption: z.string(),
  }),
]);

const widget = z.object({
  aria: z.string(),
  event: z.string(),
  meta: z.string(),
  sessions: z.array(z.string()),
  stage: z.string(),
  mapAria: z.string(),
  mapText: z.string(),
  seatTitle: z.string(),
  legend: z.object({ sold: z.string(), held: z.string(), wheelchair: z.string(), selected: z.string() }),
  /* Price categories by rows (five), the organizer's fee and the hold time: the cart is computed from these. */
  currency: z.string(),
  categories: z.array(z.object({ name: z.string(), price: z.number(), rows: z.string() })).min(1).max(5),
  feePercent: z.number(),
  holdMinutes: z.number(),
  line: z.string(),
  lineOne: z.string(),
  qty: z.string(),
  fee: z.string(),
  held: z.string(),
  pay: z.string(),
  empty: z.string(),
  tips: z.object({ free: z.string(), wheelchair: z.string(), selected: z.string(), sold: z.string(), held: z.string(), blocked: z.string() }),
  modal: z.object({ title: z.string(), text: z.string(), primary: link, bot: link, close: z.string() }),
});

/* ---------- Page sections (discriminated by `type`) ---------- */
const sectionBase = { id: z.string().optional(), eyebrow: z.string().optional(), title: z.string().optional(), lead: z.string().optional() };

export const section = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hero'), ...sectionBase, title: z.string(), primary: link, secondary: link, note: z.string(), widget: widget.optional() }),
  z.object({ type: z.literal('facts'), ...sectionBase, items: z.array(z.string()) }),
  z.object({ type: z.literal('steps'), ...sectionBase, items: z.array(z.object({ title: z.string(), text: z.string() })), note: z.string().optional() }),
  z.object({ type: z.literal('ways'), ...sectionBase, items: z.array(z.object({ title: z.string(), text: z.string(), bullets: z.array(z.string()) })) }),
  z.object({ type: z.literal('qa'), ...sectionBase, items: z.array(z.object({ title: z.string(), text: z.string(), visual: visual.optional() })) }),
  z.object({ type: z.literal('center'), ...sectionBase, bullets: z.array(z.string()), note: z.string(), stripAria: z.string(), screens: z.array(ecScreen) }),
  z.object({
    type: z.literal('money'),
    ...sectionBase,
    flowAria: z.string(),
    nodes: z.array(z.object({ label: z.string(), sub: z.string().optional(), providers: z.boolean().optional(), highlight: z.boolean().optional() })),
    note: z.string(),
  }),
  z.object({
    type: z.literal('pricing'),
    ...sectionBase,
    planBullets: z.array(z.string()),
    cta: link,
    /** Home page: price cards, low-price and venue blocks only; the package table and the calculator live on /pricing. */
    compact: z.boolean().optional(),
    currencyNote: z.string(),
    lowPrice: z.object({ title: z.string(), text: z.string(), example: z.string().optional(), cols: z.object({ price: z.string(), plain: z.string(), seated: z.string() }).optional() }),
    packages: z.object({
      title: z.string(), text: z.string(), note: z.string(),
      cols: z.object({ name: z.string(), prepay: z.string(), plain: z.string(), seated: z.string(), plainCount: z.string(), seatedCount: z.string(), saving: z.string(), buy: z.string().optional() }),
      buy: z.object({ label: z.string(), currency: z.string(), none: z.string(), noneHref: z.string(), note: z.string().optional() }).optional(),
    }).optional(),
    venues: z.object({ title: z.string(), text: z.string(), example: z.string().optional(), cta: link }),
    calculator: z.object({
      aria: z.string(), button: z.string().optional(), hint: z.string().optional(), region: z.string(), regionEu: z.string(), regionWorld: z.string(), price: z.string(), maxPrice: z.string(), quantity: z.string(), seating: z.string(),
      result: z.string(), sales: z.string(), needMax: z.string(), maxBelowPrice: z.string(), lowRate: z.string(), package: z.string(), noPackage: z.string(),
    }).optional(),
    note: z.string(),
    buyCredits: link.optional(),
    /** Two plan cards as on the reference pricing page: pay as you go and pay upfront with credits, a $/€ switch, perks and the brand line. */
    plans: z.object({
      currency: z.string(),
      payg: z.object({ name: z.string(), text: z.string(), bullets: z.array(z.string()) }),
      upfront: z.object({ name: z.string(), text: z.string(), from: z.string(), bullets: z.array(z.string()) }),
      perks: z.array(z.object({ big: z.string(), title: z.string(), text: z.string() })),
      brand: z.string(),
    }).optional(),
    terms: link,
  }),
  z.object({ type: z.literal('who'), ...sectionBase, items: z.array(z.object({ icon: z.string(), title: z.string(), text: z.string(), link: link })) }),
  /* Home: the four reasons (doc 51 §1): benefit, speed, convenience, reliability. {price}, {seated}, {countries}, {since} come from data. */
  z.object({ type: z.literal('reasons'), ...sectionBase, items: z.array(z.object({ icon: z.string(), title: z.string(), text: z.string(), bullets: z.array(z.string()).optional(), link: link.optional() })).length(4) }),
  z.object({ type: z.literal('clients'), ...sectionBase, cta: link, marksAria: z.string() }),
  z.object({ type: z.literal('changes'), ...sectionBase, cta: link, more: link, limit: z.number().optional() }),
  z.object({ type: z.literal('cta'), ...sectionBase, title: z.string(), text: z.string(), primary: link, secondary: link, note: z.string() }),
  /* generic blocks for inner pages */
  z.object({ type: z.literal('prose'), ...sectionBase, body: z.string() }),
  z.object({ type: z.literal('faq'), ...sectionBase, items: z.array(z.object({ q: z.string(), a: z.string() })) }),
  z.object({ type: z.literal('providers'), ...sectionBase, labels: z.object({ currencies: z.string(), methods: z.string(), checkout: z.string(), statuses: z.record(z.string()), methods_map: z.record(z.string()) }) }),
  z.object({ type: z.literal('coverage'), ...sectionBase, labels: z.object({ countries: z.string(), note: z.string(), missing: z.string() }), cta: link }),
  z.object({ type: z.literal('markets'), ...sectionBase, preparing: z.object({ title: z.string(), text: z.string() }) }),
  z.object({ type: z.literal('cards'), ...sectionBase, items: z.array(z.object({ title: z.string(), text: z.string(), link: link.optional() })) }),
  z.object({ type: z.literal('code'), ...sectionBase, code: z.string(), items: z.array(z.object({ key: z.string(), text: z.string() })), cta: link }),
  z.object({ type: z.literal('marks'), ...sectionBase }),
  z.object({ type: z.literal('changelog'), ...sectionBase }),
  z.object({ type: z.literal('posts'), ...sectionBase, empty: z.string() }),
  z.object({ type: z.literal('facts-table'), ...sectionBase }),
  /* "Contact the team" form inline (doc 51 §1.3); its fields and messages are interface strings (i18n contact.*). */
  z.object({ type: z.literal('contact-form'), ...sectionBase }),
  z.object({
    type: z.literal('onboarding'),
    ...sectionBase,
    /** Which page of the application this is: the steps, the e-mail for a new link, the e-mail confirmation. */
    mode: z.enum(['apply', 'continue', 'confirm']),
    /** Every UI string of the client script (labels of the form itself come from the platform's form-schema). */
    ui: z.record(z.string(), z.string()),
    alt: z.object({ text: z.string(), link: link }).optional(),
  }),
]);

export type Section = z.infer<typeof section>;

const pages = defineCollection({
  loader: glob({ pattern: '*/pages/**/*.yaml', base: './content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Set when this file was translated from the `en` original; CI compares hashes (§3.6). */
    source_hash: z.string().optional(),
    h1: z.string().optional(),
    lead: z.string().optional(),
    /** Internal links shown as "Read next" before the final CTA (SEO interlinking). */
    related: z.array(z.object({ label: z.string(), href: z.string(), text: z.string().optional() })).optional(),
    sections: z.array(section),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '*/posts/**/*.{md,mdx}', base: './content' }),
  schema: ({ image }) => z.object({
    cover: image().optional(),
    cover_alt: z.string().optional(),
    /** Hand-picked related site pages for internal linking (SEO); defaults are added by the layout. */
    related: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('ArenaSoldOut.com'),
    tags: z.array(z.string()).default([]),
    /** Old WordPress address, used to generate the 301 map. */
    legacy_url: z.string().optional(),
    archive: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*/notes/**/*.md', base: './content' }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), source_url: z.string().url().optional() }),
});

const cases = defineCollection({
  loader: glob({ pattern: '*/cases/**/*.md', base: './content' }),
  schema: z.object({ title: z.string(), client: z.string(), city: z.string().optional(), date: z.coerce.date(), quote: z.string().optional(), consent: z.boolean() }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './content/data/changelog' }),
  schema: z.object({ date: z.coerce.date(), title: z.string(), details: z.string().optional(), links: z.array(link).default([]) }),
});

const providers = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './content/data/providers' }),
  schema: z.object({
    name: z.string(),
    regions: z.array(z.string().length(2)),
    currencies: z.array(z.string().length(3)),
    methods: z.array(z.enum(['card', 'apple_pay', 'google_pay', 'bit', 'installments', 'bank_transfer'])),
    hosted_checkout: z.boolean(),
    status: z.enum(['live', 'api', 'planned']),
    entity_countries: z.array(z.string().length(2)).default([]),
    note: z.string().optional(),
    order: z.number().default(100),
  }),
});

const markets = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './content/data/markets' }),
  schema: z.object({
    iso2: z.string().length(2),
    name: z.record(z.string()),
    group: z.string().optional(),
    languages: z.array(z.string()),
    currencies: z.array(z.string().length(3)),
    providers: z.array(z.string()),
    status: z.enum(['live', 'planned']),
    vat_note: z.string().optional(),
    order: z.number().default(100),
  }),
});

const pricing = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './content/data/pricing' }),
  schema: z.object({
    region: z.string(),
    currency: z.string().length(3),
    per_ticket: z.number(),
    seating_extra: z.number(),
    highlighted: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

export const collections = { pages, posts, notes, cases, changelog, providers, markets, pricing };
