# PRD: arenasoldout.com, first wave

Owner: Andrei (abhteam). Co-founder review: Marina. Architecture: `design/33_arenasoldout_marketing_site_ru.md`.

## Goal

Replace the WordPress marketing site with a static Astro site that an organizer reads in two
minutes, that AI agents can quote verbatim, that deploys to Cloudflare Workers Static Assets and
can move to our own nginx without a rewrite. Development happens on `new.arenasoldout.com`
with `noindex`; the apex and `www` switch over on launch day.

## Scope of the first wave

| Route | Content | Status in wave 1 |
|---|---|---|
| `/` | Home, one to one from `design/prototype/direction-a.html` (final EN copy) | Full |
| `/pricing` | Cards EU/US/World, venues 2%, calculator, FAQ; `/pricing/terms` with Detailed terms (draft from doc 33 §4.3a) | Full |
| `/payments` | Providers by region from data, statuses, methods, currencies, "how to connect", block "In preparation" (regions only) | Full |
| `/facts` + `/facts.json` | What exists, what does not, since when; pricing, providers, markets, languages, load, backups | Full |
| `/developers` | Three lines, public API, event bundle, webhooks, scoped keys, widget events, WordPress plugin, link to OpenAPI | Full |
| `/clients` | Wordmarks (text), track record, link to testimonials (gallery later) | Full |
| `/blog` | Skeleton: index reads the `posts` collection; archive import is wave 2 | Skeleton |
| `/changes` | Skeleton: reads the `changelog` collection, same ten lines as the home page | Skeleton |
| `/start` | Organizer application drawn in the browser from the platform's `form-schema` (contact, organization, events, payments, consent), autosaved per step, Turnstile, created through `/v1/onboarding` | Full |
| `/start/continue`, `/start/confirm` | A new link to an open draft by e-mail; confirmation of the e-mail from the link | Full |
| `/start/thanks` | Success page after the application is sent | Full |
| `/llms.txt`, `/llms-full.txt`, `/*.md`, `/robots.txt`, `/sitemap-index.xml` | Generated from the same data | Full |
| `/404` | Not found page | Full |

Out of scope for wave 1: translations (ES, CS, RU folders exist as config, content only EN),
blog archive import and 301 map for 146 old posts/pages (wave 2, `redirects.yaml` carries the
first entries), testimonials gallery, `/demo`, `/contact`, `/partners`, `/compare/*`, OG image
generation, Pagefind, Umami (server not up; config slot exists), `/help/tickets`, legal pages
(wave 2, moved from WordPress), Keystatic (config-ready, not installed).

## Information architecture

```
/                      home
/pricing               pricing + calculator;  /pricing/terms  detailed terms
/payments              providers and markets
/developers            widget, API, webhooks, plugin
/clients               clients and track record
/facts                 facts table;  /facts.json
/blog                  posts;  /blog/<slug>
/changes               changelog;  /changes.json (JSON Feed) later
/start                 application;  /start/thanks
/<lang>/...            mirrors for es, cs, ru (config ready, no content in wave 1)
```

Header: logo, How it works, Who it is for, Pricing, Event center, Blog; right: Sign in
(app.arenasoldout.com), language, theme, "Start selling". Footer: Product, Who it is for, For
developers, Company, Legal; copyright line "© 2019–2026 Arena Sold Out · ABH TEAM OÜ · EU".

## Content model (section 3.8)

All copy lives in `content/`. Components receive data from collections; no prose in `.astro`.

- `content/<lang>/pages/<slug>.yaml`: structured sections (`hero`, `facts`, `steps`, `ways`,
  `qa`, `center`, `money`, `pricing`, `who`, `clients`, `changes`, `cta`), zod-typed.
- `content/<lang>/posts/*.md`, `notes/*.md`, `cases/*.md`: free Markdown with frontmatter.
- `content/data/changelog/*.yaml`, `providers/*.yaml`, `markets/*.yaml`, `pricing/*.yaml`,
  `clients.yaml`, `facts.yaml`, `nav.yaml`: language-independent data.
- `i18n/<lang>.json`: UI strings with fallback to `en`.

Editing a text = editing one YAML/Markdown file (GitHub web editor is enough), push to `main`,
CI builds and deploys in a few minutes. Keystatic can be attached later with one config file
because every collection already has a zod schema.

## Non-functional requirements

- Astro `static` only. No KV, D1, R2, Durable Objects, no server rendering per request.
- Lighthouse 100 on all four categories on the home page (CI gate), TTFB < 200 ms from Europe.
- Both themes, prefers-color-scheme + visitor choice, no flash (section 3.11).
- Portability: `redirects.yaml` and `headers.yaml` generate both `_redirects`/`_headers` and
  nginx config; nginx image built on every push with a smoke test (section 3.7a).
- No form backend on the site: the application form calls the platform API from the browser (doc 34 §9), the platform verifies Turnstile and notifies the operator.
- Agents: `llms.txt`, `llms-full.txt`, Markdown twin per page, JSON-LD on every page, `/facts`,
  robots allowing AI crawlers (section 3.10). On `new.` everything is `noindex` until launch.

## Acceptance criteria

1. `npm run build` produces `dist/` with every route above; `npm run check` passes (lint,
   anti-slop grep, translation parity, JSON-LD, agent files, redirects parity).
2. Home page matches the prototype one to one in copy and layout at 320, 768, 1280 and 1920 px,
   light and dark.
3. Lighthouse CI on `/`: performance, accessibility, best practices, SEO all 100.
4. `https://new.arenasoldout.com/` serves the home page with `noindex` and `robots.txt`
   `Disallow: /`; `/llms.txt`, `/index.md`, `/facts.json` return 200 with correct content types.
5. The nginx image built in CI serves `/` with 200, an entry from `redirects.yaml` with 301, and
   the security headers from `headers.yaml`.
6. A test application passes every step on `/start`, the confirmation e-mail arrives, after submit the
   application is visible in the platform's "Onboarding" admin section and the operator gets the Telegram message.
7. No secret in the repository; CI deploys with `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` only.
8. README explains local run, deploy, text editing, and the launch-day domain switch.

## Open questions for the owner (do not guess)

- Final tariff numbers (Marina: after competitor pricing analysis). Cards show €1.00 / $1.00 /
  $1.00 and +0.50 with a seating plan from `content/data/pricing`.
- Exact country and city counts for the trust row (Bil24 export).
- Logos vs text wordmarks on `/clients`.
- Partner-seller links on the hosted page: Andrei's words, verify before launch.
- Legal pages text (transfer from WordPress) and the Umami instance.
