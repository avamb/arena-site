# Arena Sold Out — marketing site home page prototypes: shared brief

Three directions (A, B, C) share the SAME content below and differ only in visual identity.
Each prototype is ONE self-contained HTML file: the full home page, desktop + phone, light + dark.
Site language: English (prototype copy is final-quality English; site will be translated later).

## Who we are (ground truth — never promise anything outside this list)

Arena Sold Out is ticketing infrastructure for event organizers: theatres and venues with
reserved seating (100–1500 seats), festivals, touring shows, wine tastings and master classes,
organizers who sell on their own WordPress site. It is NOT a marketplace or an event listing.

Verified capabilities (OK to claim):
- Reserved seating in the core: seating plans with versions, SVG import, mixed seated + general
  admission in one show, prices per category. Seating costs the same as any ticket — no surcharge
  (old price list: +0.50 per seated ticket; keep the OLD price list on the pricing block, see below).
- Money goes straight to the organizer's own payment account. Arena never holds funds. Providers are DATA, never prose:
  live today Stripe (hosted checkout), Flitt (hosted checkout, EUR/GEL), AllPay (Israel: Isracard, Leumi Card, Bit,
  installments; via API, hosted widget checkout pending). Prose says "your payment account"; names come from the list.
  Markets live today: Czechia, Spain, France, Georgia, Israel. Planned (Balkans, South America, Switzerland) are
  never named on the home page, only in the /payments 'in preparation' block without provider names.
- Sell anywhere: hosted sales page tickets.arenasoldout.com/{org}/{event}; a promoter page per
  partner; the `<arena-tickets>` widget embeds on any site with 3 lines; WordPress via plugin.
- Organizer in Telegram: create an event from a poster photo (AI reads the poster, every reading
  is a button to confirm), edit, add dates, team, sample ticket; every sale and refund posted to the
  organizer's group within seconds, with buyer contact.
- Buyer in their language: page, widget, e-mail and PDF ticket (page: en/ru/cs/he/es; e-mails in 7
  languages; RTL for Hebrew).
- Pricing tools: promo codes (scope, windows, per-buyer limits), price windows (early bird),
  quantity-step pricing and category chains, free and pay-what-you-want tickets.
- E-ticket PDF with EAN-13 + QR, scanning through MACS access control, sample ticket with watermark.
- Buyers get e-mails when a session moves or is cancelled.
- Reliability: 800 orders a minute at 1,000 concurrent visitors in load tests; ops watchdog with
  Telegram alerts; nightly encrypted backups; Cloudflare in front.
- Developers: public API, event-bundle import (one call creates event + sessions + venue + prices
  + poster + publication), signed webhooks, scoped API keys, widget custom events `arena:*`.
- Imports from Bil24 (sessions, seating plans, customers) — "replace Bil24" is a real story:
  two clients moved with zero downtime.

Do NOT claim: waitlists, access codes, custom checkout questions, multi-event cart, Apple/Google
Wallet, tax invoices, mobile app, buyer account, one-click refunds for organizers without a site,
self-service signup (today onboarding is "Start → we set you up"), "best available seats",
customer counts we don't have ("73,000 organizers" style numbers are forbidden).

Clients (consent confirmed; use as text wordmarks, no logos): Lampyris Events (Prague),
Vino&Co (Israel), Teatro Escuela Madrid, Actorre (Guardamar festival), Family Theatre Kolybel.

## Iteration 2: founders' review 08.10 (Marina + Andrei), applied to direction A

The home page is read by an organizer for two minutes. Order and rules that override the structure below:

1. Hero: H1 "Sell seats. Sell tickets. Keep the money." (organizers sell tickets as often as seats). Never open with
   "reserved seating". Lead = value for the organizer: on sale in minutes, own site or hosted page, own payment
   account, full control of tickets and payouts. CTAs "Start selling" + "Create your event". Note: "Connect your
   payment account in minutes. Events without a seating plan go on sale today." Never "no card needed", never "in a day".
2. Trust row = facts only (35 countries since 2019, 800 orders/min, 7 languages, payouts to your account). Client
   wordmarks move down into a Clients block.
3. "How it works" answers the three first questions: How fast? What do I need? Which way? (browser event center,
   Telegram bot, or we set it up). Telegram and poster reading are ONE way, never the only one.
4. "Where you sell": two cards, you have a site (widget on ANY site, WordPress is one option) / you do not (hosted page,
   promoter page). Money goes to you either way.
5. "What organizers ask next": nine Q/A tiles, each starting with "Yes": promo codes, price changes by date, several
   prices, service fee, seats and no seats, scanner, sales reports, refunds/invitations/date changes, stadium load.
   Word rule: "venue", never "hall" (a hall is the lobby). We are not a venue-management system.
6. Event center block: orders, tickets, refunds, invitations, sessions, team, in one place; Telegram is the same center
   in the bot. (Owner decision: announce it, it runs for current clients today and moves into the platform next.)
7. Money: "Buyers pay you. Not us." Flow: Buyer → your site or hosted page → Arena (order, seats, ticket) → your payment
   account → your bank. Fee invoiced the day after the event. Acquiring is separate, on the provider's own terms.
8. Pricing: platform fee only, no "card processing" wording. No "white label €45/month" on the cards: the condition is
   "name Arena Sold Out as the ticketing partner on your event page", the fee for not doing so lives in "Detailed terms".
   Permanent venues: separate terms, 2% instead of the per-ticket fee, clearly not additive. Prices are data from the
   platform pricing policy; "volume and individual terms on request". The numbers themselves are NOT decided (Marina:
   needs a competitor pricing analysis first).
9. "Who it is for" (not "Solutions"): concerts, theatre shows, festivals, concert tours (never bare "tours"), master
   classes and tastings, venues and clubs.
10. Clients: "Organizers in 35 countries since 2019" + wordmarks + link to the testimonials page (gallery from the old site).
11. "Latest changes" (not "changelog"): weekly one-liners, scrollable, plus "tell us what you need, the team answers in person".
12. Final CTA "Start selling today" + what to do now (create event, connect account, share link); never "send us a poster" first.
13. Developers and "Live now" are NOT on the home page: developers get a footer link and their own page; live events
    return when there are 50+.

## Iteration 3: founders' second review 08.10 (applied)

- "What do I need": name and schedule, ticket prices, poster, payment account.
- Seating plan: the organizer NEVER draws it; "send us a PDF, a spreadsheet or a hand sketch, we build it in".
- Scanner app for iOS and Android, also takes partners' tickets from other systems; partner sellers' links on the
  hosted page (Andrei's words, not platform code — verify before publishing).
- Event center explained in plain words ("your own account on arenasoldout.com, phone or computer, nothing to
  install, visible to you and your team only"), linked from the sales answer, shown as a scrollable strip of three
  screens; the real site uses screenshots of the real event center.
- Money in the organizer's words: 100% of every sale goes to you; after each session you pay Arena for the platform
  service; nothing deducted or held. Never call it "our fee" on the page (organizers read "fee" as the buyer's fee).
- Pricing: €1.00 / $1.00 / $1.00 per ticket, +0.50 with a seating plan (confirm reading); calculator 1.00 / 1.50.
- Who it is for: Concerts, Theatre, Shows, Festivals, Concert tours, Master classes and trainings, Venues and clubs.
- Clients: all ten cards from the old /examples/ page + six current ones; track record line from /about/.

## Founders' answers 08.10 (evening)

- "Create your event" leads BOTH to the Telegram bot and to a web registration (being built); the event center is built in parallel.
- White label: per EVENT, not per month; the wording lives in "Detailed terms" (draft in doc 33 §4.3a).
- A competitor pricing analysis will be done before the numbers are decided.
- Fee invoiced the day after EACH session; for events on sale for many months, monthly invoicing on request.
- Reports: CSV export with a detailed per-session report; on request, exports to the client's CRM and accounting.

## Decisions 08.10

- Colour: variant 1. Brand navy #001489 is the platform colour (buttons, selected seats, links); dark theme accent #6F8CFF. Indigo #4F46E5 is banned (design-anti-slop T6).
- Direction A chosen; reworked against the anti-slop catalog (caps only in the eyebrow role, two shadow levels, no hover-shadow, no pulsing dots, control heights 46/38/28, icons from one inline set, no emoji).

## Tone

Friendly and concrete. "Yes, and here is how." A number instead of an adjective. No "#1", no
"world's most loved", no exclamation marks, no em-dashes. Short sentences. Name real things
(Stripe, Flitt, Telegram, WordPress, EAN-13).

## Page structure and copy (same for A, B, C — order may be adjusted slightly per direction)

1. Header: the real logo (vector from logo_arenasoldout/vector-files, `.logo` CSS mask coloured by the `--logo` token: #001489 on light, light grey on dark),
   nav: Product, Solutions, Pricing, Developers, Blog; right: "Sign in" (text), "Start" (button).
   Language switch "EN" (dropdown look, static).

2. Hero
   Eyebrow: "Ticketing infrastructure for organizers"
   H1: "Sell seats. Keep the money."
   Sub: "Reserved seating, your own payment account, and an organizer who runs the show
   from Telegram. Your site stays yours."
   Buttons: "Start selling" (primary), "See a live demo" (secondary).
   Small line under buttons: "Set up by our team in a day. No card needed."
   Visual: a LIVE-LOOKING WIDGET MOCK (see spec below) — a seat map with a cart. This is the
   hero image in all three directions. Build it in inline SVG + HTML (not an image).

3. Trust strip (one row): client wordmarks + three facts:
   "800 orders / minute in load tests" · "Tickets in 7 languages" · "Payouts: instant, to your account"

4. How it works (3 steps, real sequence):
   1 "Send us a poster or create the event in Telegram" — "A photo of the poster is enough. The bot
      reads it and asks you to confirm dates, prices and the venue."
   2 "Connect your payment account" — "Stripe, Flitt or AllPay. Buyers pay you. Arena never touches the money."
   3 "Share one link or embed the widget" — "tickets.arenasoldout.com/your-name, your WordPress
      page, or three lines of code on any site."

5. Features (bento grid, 6 tiles; each tile has a small product visual drawn in SVG/HTML, not a photo):
   - "Seating plans that match the hall" — versions, SVG import, mixed seated + standing.
     Visual: a small hall plan with sectors.
   - "Sales in your Telegram, seconds after payment" — buyer name, seats, amount; refunds too.
     Visual: a chat bubble "Paid · Row G 7–8 · €76.00 · Anna K." with a timestamp.
   - "Promo codes, early bird, price steps" — scope by session or category, per-buyer limits,
     the next price opens when the step sells out. Visual: a price ladder.
   - "A ticket that scans" — PDF with EAN-13 and QR, in the buyer's language, MACS at the door.
     Visual: a narrow ticket (105×297 mm proportion) with barcode.
   - "Your WordPress, your checkout" — plugin or widget; WooCommerce sites keep their shop.
     Visual: a code snippet, 3 lines (see Developers).
   - "If a date moves, buyers hear from you" — automatic e-mails on reschedule or cancellation,
     with the new ticket attached. Visual: an e-mail card.

6. Money (full-width band)
   H2: "Buyers pay you. Not us."
   Copy: "Connect your own payment account: Stripe, Flitt, or AllPay in Israel. Every ticket is paid straight to you, in your
   currency, on your statement. Arena bills its fee separately. Refunds and chargebacks are yours
   to decide, not a platform's policy."
   Visual: a two-column flow: Buyer → your payment account (Stripe · Flitt · AllPay) → your bank; Arena → invoice.

7. Pricing (keep the OLD site's price list; this is the owner's decision for launch):
   H2: "Pricing"
   Cards EU / US / World (identical numbers, currency differs: € for EU, $ otherwise):
     "0.50 per ticket" (General admission)
     "1.00 per ticket on events with a seating plan"
     "White label 45 / month" (only if you don't name Arena as ticketing partner on your page)
     "Free invitations and free refunds — no fee"
   Below: "Permanent venues: 2% of ticket price + card processing. No fee on invitations and
   refunds. No hidden fees." + link "Talk to us".
   Note line: "Card processing is paid to your provider directly. Arena invoices its fee monthly. Organizers sell today in Czechia, Spain, France, Georgia and Israel."
   Optional small calculator UI (static values fine): ticket €38 × 120 tickets → fee €60.

8. Solutions (4 cards):
   "Theatres and halls" — "100 to 1,500 seats, subscriptions later, scanning at the door."
   "Festivals" — "Many categories, several days, categories that hand over free places."
   "Tours" — "One show, many cities and dates; promoters with their own pages."
   "Tastings and master classes" — "Small groups, recurring dates, the host's own e-mails."

9. Developers (dark or contrasting band in A and C; in B it is a lit "backstage" panel):
   H2: "Three lines on any site"
   Code block (monospace):
     <script type="module" src="https://tickets.arenasoldout.com/widget/v1/arena-tickets.js"></script>
     <arena-tickets feed-token="YOUR_FEED_TOKEN" locale="en"></arena-tickets>
   Side list: "Public API", "Event bundle: one call creates the event", "Signed webhooks",
   "Scoped API keys", "Widget events arena:order_paid". Link "Read the docs".

10. Live now / Customers (3 cards of real-looking upcoming events with date, city, "On sale"):
    "Guardamar Theatre Festival · 16–18 Oct · Guardamar del Segura · 13 categories"
    "Rioja Evening · 24 Oct · Ashdod · Vino&Co"
    "Stage speech master class · 2 Nov · Madrid · Teatro Escuela"
    Caption: "Real sales pages on tickets.arenasoldout.com".

11. Changelog teaser ("What changed lately", 4 lines with dates, real):
    "7 Oct — Spanish added to the organizer bot"
    "3 Oct — Buyers get e-mails when a session moves or is cancelled"
    "1 Oct — Flitt payments (EUR, GEL)"
    "29 Sep — Telegram bot creates events from a poster photo"
    Link: "Full changelog".

12. Final CTA: "Start selling this week" — "Send us a poster. We set up your organization, your
    sales page and your payments. You keep every euro." Buttons: "Start" / "Open the Telegram bot".

13. Footer: columns Product (Sell, Seating, Pricing tools, Payments, Telegram, Tickets),
    Solutions (Theatres, Festivals, Tours, Tastings, WordPress), Developers (Docs, API, Widget,
    Webhooks, WordPress plugin), Company (About, Customers, Blog, Changelog, Contact),
    Legal (Terms, Privacy, Cookies). Bottom: "© 2019–2026 Arena Sold Out · ABH TEAM OÜ · EU",
    language switch, Telegram icon (inline SVG).

## Widget mock spec (hero)

A card ~560px wide on desktop (full width on phone), looks like a real sales widget:
- Top: event name "Autumn Jazz Night", "Fri 24 Oct · 19:30 · Palác Akropolis, Prague", session chips.
- Middle: seat map as inline SVG: a stage bar at top ("STAGE"), ~10 rows × 14 seats (small
  circles/rounded squares), rows labelled A–J. States: available (accent-tinted), sold (muted),
  held by others (hatched or dimmer), 2 selected (filled accent with white check). Price categories
  shown as a small legend: "Parterre €38", "Balcony €24", "Sold".
- Right or bottom panel: cart: "Row G · Seats 7, 8 · Parterre" 2 × €38.00; "Service fee 5%"
  €3.80; "Total €79.80"; timer "Held for 09:41"; button "Pay with Stripe" (primary).
- Make it feel alive with ONE subtle motion: the timer counts down (JS setInterval), or a seat
  pulses. Respect prefers-reduced-motion.
- It must be tokenised with the same CSS variables the real widget uses: `--arena-accent`,
  `--arena-radius`, `--arena-bg`, `--arena-border-color` (define them in :root).

## Hard technical rules (artifact page contract — follow exactly)

- ONE .html file. Do NOT write <!doctype>, <html>, <head> or <body> tags. Start the file with
  <title>...</title> then <link> for Google Fonts then <style>, then the page markup, then <script>.
- <title> is a NAME of 2–4 words, e.g. "Arena Site Direction A" (A/B/C accordingly).
- Fonts: ONLY from https://fonts.googleapis.com (link rel=stylesheet). Choose faces that cover
  Latin, Latin Extended (Czech) AND Cyrillic. Always give a fallback stack.
- External scripts: none needed. No images from the web: everything inline SVG / CSS / data URI.
  No iframes. No external fetch.
- Colors: EVERY color is a CSS custom property defined on bare :root (light values), then redefined
  in BOTH `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...; color-scheme: dark} }`
  and `:root[data-theme="dark"] {...; color-scheme: dark}`. `body { background: var(--bg); color: var(--fg) }`.
  No literal colors in component rules — tokens only. Design the dark theme properly, not inverted.
- Responsive: works at 400px width; no horizontal scroll ever; one outer wrapper with 16px+ side
  padding (`padding-inline`), vertical padding via `padding-block`; grids collapse to one column;
  `min-width: 0` on flex/grid children with text; images/aspect-ratio boxes max-width 100%.
- Everything readable is visible at rest: no opacity:0 waiting for scroll observers. Hero sized to
  content, not 100vh. Reveal animations start from a visible state.
- Sticky header: `top: env(safe-area-inset-top, 0px)`.
- Accessibility: visible focus states, real buttons/links, aria-labels on icon buttons,
  prefers-reduced-motion respected, contrast ≥ 4.5:1 for body text in both themes.
- Keep the file under ~2,500 lines; no libraries.
- Add a tiny fixed badge bottom-left: "Direction A · prototype · not live data" (B/C accordingly).
- Add a theme toggle button in the header (sets data-theme on <html>, persists in localStorage in
  try/catch) so the reviewer can flip light/dark.

## Per-direction identity (the ONLY thing that differs)

### Direction A — "Infrastructure" (Stripe-level, light)
- Feel: precise, confident, engineered. Light cool-white ground, deep ink text, ONE accent: Arena
  indigo #4F46E5. Hero sits on a deep navy-indigo band with a slow-moving gradient mesh glow
  (indigo → teal → warm coral, low saturation, animated 20s, paused under reduced-motion). Body
  sections light. Developers band dark.
- Type: "Onest" (Google Fonts; Latin-ext + Cyrillic) for everything, headings tight tracking
  (-0.03em), weights 700/500/400; "JetBrains Mono" for code and numbers in the widget.
- Layout: 12-col grid, max 1200px; bento tiles with hairline borders and faint inner gradient;
  numbers large with tabular figures. Motion: hero staggered reveal, hover lift 2px on tiles.
- Dark theme: navy ground #0B1020-ish, surfaces one step lighter, accent brightened for contrast.

### Direction B — "Stage" (dark, theatrical, editorial)
- Feel: a lit stage in a dark hall. Deep aubergine-black ground, ivory text, warm spotlight
  accent (amber #F5B342) and the Arena indigo as a secondary cool light. Subtle grain overlay
  (CSS noise via SVG feTurbulence data URI, 4–6% opacity). A soft radial "spotlight" behind the
  hero widget. Editorial serif headings.
- Type: "Playfair Display" (headings, italic for one word in the H1: "Sell seats. Keep the
  *money*."), "Manrope" for body/UI (both cover Cyrillic + Latin-ext). Mono: "JetBrains Mono".
- Layout: asymmetric hero (text left ~45%, widget right overlapping the ground band), generous
  whitespace, section titles as large serif with a small amber eyebrow. Features as a staggered
  two-column list with visuals, not a uniform grid. Pricing cards on ivory "playbill" panels.
- Light theme (must exist): ivory ground #F6F1E7, aubergine text, amber kept as accent on
  darker chips; the spotlight becomes a soft warm wash. Dark is the primary design; build
  dark-first (dark on :root with color-scheme: dark, light under prefers-color-scheme: light
  guarded by :root:not([data-theme="dark"]) and under :root[data-theme="light"]).

### Direction C — "Product first" (white, monochrome, the widget is the design)
- Feel: Luma/Linear calm. Pure white ground, near-black ink, warm-grey neutrals with a slight
  indigo bias, ONE accent (Arena indigo) used only on primary actions and selected seats. No
  gradients, no decoration; product screenshots drawn in HTML are the visuals. Big generous
  type, lots of air, hairlines.
- Type: "Wix Madefor Display" for headings and "Wix Madefor Text" for body (both cover Latin-ext,
  Cyrillic AND Hebrew — a real argument for us). Mono: "JetBrains Mono".
- Layout: centered column max 1100px; hero is the widget mock centered BELOW the headline, large
  (the hero IS the product). Features as a vertical rhythm of alternating text + UI mock (not
  bento). Pricing as a simple table. Developers band: light grey panel, not dark.
- Dark theme: #0F1115 ground, surfaces #15181E, same single accent.

## Deliverable per agent

Write the file to the path given in your task. Then open it once in a browser-like check if you
have one (not required); fix anything obviously broken (overflow, unreadable dark theme). Do not
publish artifacts — the lead publishes. Report back: path, the fonts chosen, anything you could
not fit, and any claim you were unsure about.
