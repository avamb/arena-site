# DESIGN.md

The system behind every screen. Tokens are copied from `design/prototype/direction-a.html`
(direction A, variant 1 of 08.10) and live in `src/styles/tokens.css`. Components use tokens
only; a literal colour outside `tokens.css` fails the anti-slop check.

## Colour tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#F6F7FB` | `#0B1020` | page background |
| `--surface` | `#FCFCFE` | `#121831` | cards, widget |
| `--surface-2` | `#EDEFF6` | `#182043` | bands, chips, visual fills |
| `--fg` | `#0B1020` | `#EEF0F8` | text |
| `--fg-2` | `#4D536B` | `#B2B7D0` | secondary text |
| `--fg-3` | `#7B819A` | `#7E86A8` | muted text, captions |
| `--line` | `#DDE0EB` | `#242D4F` | hairline borders |
| `--line-2` | `#C9CDDD` | `#334071` | stronger borders, ghost buttons |
| `--accent` | `#001489` | `#6F8CFF` | the platform colour: primary buttons, selected seats, links |
| `--accent-hover` | `#1527A6` | `#8FA3FF` | hover of the above |
| `--accent-fg` | `#F7F8FF` | `#0B1020` | text on accent |
| `--accent-soft` | `#E7EAF9` | `#1A2452` | available seats, highlighted node |
| `--accent-line` | `#A6B0E3` | `#3B4C9E` | border of soft accent |
| `--cat2` / `--cat2-soft` | `#0F9F9A` / `#D7F3F1` | `#2DD4C8` / `#113C3A` | second price category |
| `--band` / `--band-2` | `#0B1020` / `#121A36` | `#070B18` / `#0E1430` | hero and CTA band |
| `--band-fg` / `--band-fg-2` / `--band-line` | `#F2F4FB` / `#AEB4CF` / `#263055` | same / same / `#1F2848` | text and lines on bands |
| `--mesh-1` / `-2` / `-3` | `#1E3BD1` / `#4A66F0` / `#F05537` | same | hero mesh blobs (the one bold move) |
| `--code-bg` / `--code-fg` / `--code-key` / `--code-str` / `--code-attr` | `#0B1020` / `#D9DCEC` / `#9DD6FF` / `#7DD3C0` / `#B9C6FF` | `#070B18` / rest same | code block |
| `--ok` / `--ok-soft` | `#15803D` / `#DCFCE7` | `#4ADE80` / `#113A24` | paid, on sale |
| `--warn` / `--warn-soft` | `#B45309` / `#FEF3C7` | `#FBBF24` / `#3A2A08` | pending, timer |
| `--sold` / `--held` | `#CDD1DE` / `#9AA1BB` | `#2B3356` / `#4A5480` | seat states |
| `--logo` | `#001489` | `#F2F4FB` | logo mask fill |

Widget tokens shared with the real widget: `--arena-accent: var(--accent)`, `--arena-radius: 12px`,
`--arena-bg: var(--surface)`, `--arena-border-color: var(--line)`.

Theme mechanics (doc 33 §3.11): tokens on `:root`; dark values under
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and under
`:root[data-theme="dark"]`; `color-scheme` set in both; `<meta name="color-scheme" content="light dark">`;
inline script in `<head>` applies `localStorage['aso-theme']` before paint. Priority: visitor's
choice → device → light. Never rotate themes on visitors.

Banned colours: `#4F46E5` and the Tailwind indigo/violet range (anti-slop T6), pure `#000`/`#fff`
in base tokens (T20). Dark theme has no neon glow.

## Typography

- `--font`: "Onest" (variable, self-hosted via `@fontsource-variable/onest`, Latin, Latin-ext,
  Cyrillic), fallback `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`.
- `--mono`: "JetBrains Mono" (variable, self-hosted), fallback `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Roles: display (h1 `clamp(42px, 6.2vw, 76px)` weight 800 tracking -0.045em; h2
  `clamp(30px, 4.2vw, 46px)` weight 700 tracking -0.03em), body 16px / 1.55, lead
  `clamp(17px, 1.4vw, 19px)` in `--fg-2`, control 15px weight 600, small/meta 12.5–13.5px,
  eyebrow 13px weight 600 uppercase tracking 0.08em in `--fg-2`.
- Numbers: `font-variant-numeric: tabular-nums` (`.num`), money and codes in `--mono`.
- Uppercase exists in exactly one role: `.eyebrow`. Nowhere else (T3).
- At most two families on a page. No Inter, Roboto, Poppins (T14).

## Spacing, radii, controls

- Gutter `--gutter: clamp(16px, 4vw, 40px)`, container `--max: 1200px`.
- Section padding `clamp(56px, 8vw, 104px)`; inside a section the first block sits 40px below
  the heading; tile padding 24px; card padding 22–26px.
- Gaps: 16px between tiles, 20px between steps, 12px between buttons, 8–10px inside lists.
- Radii: `--r: 12px` (inputs, nodes, marks), `--r-lg: 18px` (cards, tiles, widget), pills 999px.
- Control heights: `--ctl: 46px` (buttons, inputs), `--ctl-sm: 38px` (header button, language,
  icon buttons), `--ctl-xs: 28px` (chips, pills, timer). Adjacent controls share one height (T25).

## Borders and shadows

- Default elevation is a 1px `--line` border on `--surface`. Cards exist only where an entity
  needs a boundary (tiles, plans, marks, mock screens).
- Two shadow levels only: `--shadow` (highlighted plan) and `--shadow-lg` (the hero widget).
  No hover shadows (T12).
- Hover: border to `--line-2`, text to `--fg`, primary button to `--accent-hover` with a 1px lift.
  Transitions name their properties, never `transition: all` (T19).

## Accent budget

Per viewport: the primary button, the selected seats or one key number, and inline links.
Decorative icons are `--fg` on `--surface-2`, never accent (T9).

## Icons

One set: Lucide (ISC), inline SVG through `src/components/Icon.astro`, 24px viewBox, stroke
1.8, `currentColor`, `aria-hidden` unless the icon is the only content of a control. The Telegram
glyph is a brand mark, kept inline in `Icon.astro` as the single exception. No emoji in UI (T2).

## Motion

Hero mesh drift (26–32s, the one bold move), hero stagger reveal from a visible state, seat
"pop" on selection, countdown in the widget. All off under `prefers-reduced-motion`. Nothing
animates on scroll.

## Responsive

Grids collapse: 6-column bento → 3 → 1; steps 3 → 1; plans 3 → 1; who-cards 4 → 2 → 1; marks
4 → 3 → 2; flow row stacks vertically with rotated arrows under 900px; header nav links hide
under 900px (the header keeps the logo, theme and "Start selling"). `min-width: 0` on every
grid child with text. No horizontal page scroll at 320–1920 px.

## Copy style

Friendly and concrete. "Yes, and here is how." A number instead of an adjective. Short
sentences. Real names (Stripe, Flitt, Telegram, WordPress, EAN-13) only from data. No "#1", no
"world's most loved", no exclamation marks, no em-dashes, no "Get started". H2s are questions
organizers ask where the section answers one. Prose says "your payment account".

## Deliberate prohibitions (anti-slop, `design/anti-slop-skill/references/catalog.md`)

- T1 no coloured left border on rounded cards.
- T2 no emoji, no second icon set.
- T3 uppercase only in `.eyebrow`, always with letter-spacing ≥ 0.06em.
- T4 status chips from state tokens (`--ok`, `--warn`), not pastel defaults.
- T5/T12 two shadow levels, no hover shadows.
- T6 no indigo/violet, no gradient text.
- T8 one primary button per row.
- T9 accent budget above.
- T10 no country flags; regions as text.
- T14 Onest + JetBrains Mono only.
- T16 no untouched UI-kit theme; Tailwind is loaded without preflight, utilities only.
- T17 hero sized to content, no 100vh; section count from content.
- T19 named transitions, no scroll-triggered fades.
- T20 no pure black/white tokens, no neon in dark.
- T21 banned words grep in CI: Elevate, Unlock, Supercharge, Seamless, Empower, Streamline,
  Leverage, "Get started", "Learn more".
- T23 no pulsing status dots.
- T24 underline only on inline links in prose, never on buttons.
- T25 adjacent controls share a height from the scale.

Kept on purpose (documented, do not flag again): hero mesh (T22), header blur (single use),
three steps in "How it works" (real sequence, T17), bento in "What organizers ask next" (nine
real answers).
