# UX decisions

Source of truth for every screen before any code. Derived from `design/prototype/BRIEF.md`
(Iteration 2/3 and Founders' answers take priority), `design/33_arenasoldout_marketing_site_ru.md`
(sections 3.6–3.11, 4.1–4.4) and `design/00-practical-web-build-playbook.md`.

## Who reads the site

- **The organizer, a person of action.** Runs concerts, theatre shows, festivals, concert tours,
  master classes and tastings, or owns a venue. Sells their own tickets (100–1,500 seats or
  general admission). Reads a page for about two minutes, on a phone as often as on a laptop,
  looking for answers to the first three questions: how fast, what do I need, which way.
- Secondary readers: the organizer's developer (`/developers`), a buyer who landed here by
  mistake (`/help/tickets`, later), and AI agents that answer organizers' questions
  (`/llms.txt`, `/facts`, Markdown twins; see section 3.10 of doc 33).
- Not the audience: the general public looking for events. Arena is infrastructure, not a
  marketplace, and never shows an event catalogue.

## One task per page, one primary action

| Page | The reader's question | Primary action | Secondary |
|---|---|---|---|
| `/` | Can I sell my tickets with this, and will the money be mine? | **Start selling** (`/start`) | **Create your event** (`/start#create`: Telegram bot + web registration) |
| `/pricing` | What does a ticket cost me, exactly? | Start selling | Detailed terms |
| `/payments` | Where does the money go and which provider works in my country? | Start selling | Read how to connect |
| `/start` | What do I send you to get going? | Submit the form | Open the Telegram bot |
| `/developers` | How do I put the widget on my site? | Copy the three lines | Read the API docs |
| `/clients` | Who already sells with this? | Start selling | — |
| `/facts` | What exactly is true about this platform today? | (none, reference page) | — |
| `/blog`, `/changes` | What is new, what have they written? | Read | Subscribe (later) |

Rules: exactly one primary button per screen, in the hero and in the final CTA. Both home CTAs are
verbs of the product ("Start selling", "Create your event"), never "Get started" or "Learn more".
Header carries one button only ("Start selling").

## Order of arguments on the home page (founders' review 08.10)

1. Hero: "Sell seats. Sell tickets. Keep the money." Value for the organizer first, never
   "reserved seating" first. Note under the buttons: "Connect your payment account in minutes.
   Events without a seating plan go on sale today."
2. Trust row: facts only (31 countries since 2019, 800 orders a minute, 7 languages, payouts to
   your account). No client marks here.
3. How it works: three questions organizers ask first (how fast, what do I need, which way).
   Telegram is one way, never the only one.
4. Where you sell: you have a site / you do not. Money goes to you either way.
5. What organizers ask next: nine answers, each starting with "Yes".
6. Event center: in plain words, three scrollable screens.
7. Money: "Buyers pay you. Not us." Flow Buyer → your site or our page → Arena → your payment
   account → your bank.
8. Pricing: per ticket, platform service only, no "card processing" wording, no white-label
   price on the cards. Venues: 2% instead of, never on top of.
9. Who it is for: seven cards.
10. Clients: 31 countries since 2019, sixteen wordmarks as text, founders' track record.
11. Latest changes: weekly one-liners, scrollable.
12. Final CTA: "Start selling today" + what to do now.
13. Not on the home page: Developers (footer link + own page), "Live now" (returns at 50+ events).

## Proof we are allowed to show

Only what `design/prototype/BRIEF.md` lists as verified, and what `content/data/facts.yaml`
records with a date:

- 800 orders a minute at 1,000 concurrent buyers in load tests (report 23.09.2026).
- Organizers in 31 countries since 2019 (31 countries in the Forzum Editor list, Russia excluded, 20.10.2026).
- Tickets and e-mails in 7 languages; sales page in en/ru/cs/he/es; RTL for Hebrew.
- Payment providers live today: Stripe, Flitt, AllPay (always from `content/data/providers`).
- Markets live today: Czechia, Spain, France, Georgia, Israel (from `content/data/markets`).
- Two clients moved from Bil24 with zero downtime.
- Client wordmarks with consent, as text, no logos: Lampyris Events, Vino&Co, Teatro Escuela
  Madrid, Actorre, Family Theatre Kolybel, MyEventsArt, plus the ten from the old `/examples/`.
- Founders' earlier platforms: Cirque du Soleil shows, FIFA 2018 stadiums, World Choir Games,
  800 ice shows, always with "the founders' earlier platforms".
- Nightly encrypted backups, watchdog with Telegram alerts, Cloudflare in front.

## Promises we never make (grep-checked in CI, see `scripts/check-anti-slop.mjs`)

Waitlists, access codes, custom checkout questions, multi-event cart, Apple or Google Wallet,
tax invoices, a mobile app for buyers, a buyer account, one-click refunds for organizers without a
site, self-service signup (today: "Start → we set you up"), "best available seats", customer
counts we do not have ("73,000 organizers"), "no card needed", "#1", "world's most loved",
exclamation marks, em-dashes, AllPay inside the hosted widget (until shipped), named providers
for Switzerland, the Balkans or South America.

Words: "venue", never "hall" (a hall is the lobby). "Concert tours", never "tours". "Event center",
not "dashboard". Never "our fee" on a page: organizers read "fee" as the buyer's fee; say
"you pay Arena for the platform service". Prose says "your payment account"; provider names come
only from data (`<Providers status="live" />`).

## States that must exist

- Form `/start`: idle, submitting, success (thanks page, also without JS), validation error per
  field, server error with a retry and the Telegram alternative, honeypot silently accepted.
- Theme: light, dark, visitor's explicit choice persisted; no flash on load.
- Reduced motion: hero mesh and reveal animations off, timer static.
- No JS: seat map, calculator defaults, theme from device, form posts normally.
- Untranslated page in a non-default language: English content with a "not yet translated"
  note and `noindex` (section 3.6), never a 404.
- Dev subdomain (`new.arenasoldout.com`): `noindex` everywhere, `robots.txt` disallows all,
  switched by one config flag on launch day.

## Mobile first

Every screen works at 320 px: single column, no horizontal scroll, controls 46/38/28 px high,
16 px minimum side gutter, tap targets ≥ 44 px. The hero widget goes full width under the copy.

## The main objection

"Where does my money go, and what do you take?" Answered three times: hero note, the Money band,
the pricing cards and calculator. Every number on the page comes from `content/data/pricing`.
