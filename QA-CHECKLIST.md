# QA checklist

Run before every PR and on every screen. Automated parts run in CI (`npm run check`,
`npm run lhci`, parity job); manual parts are ticked in the PR description.

## Automated (CI gates)

- [ ] `npm run build` succeeds, `astro check` has no errors.
- [ ] `scripts/check-anti-slop.mjs`: no banned words (T21), no forbidden promises from
      UX-DECISIONS, no "Stripe or Flitt" in prose, no indigo hex, no emoji in components, no
      `transition: all`, no literal colours outside `src/styles/tokens.css`, no `hall`, no
      exclamation marks or em-dashes in content.
- [ ] `scripts/check-i18n.mjs`: every translated file has the same frontmatter keys and
      `{{placeholders}}` as the `en` original; report of untranslated pages per language.
- [ ] `scripts/check-jsonld.mjs`: every HTML page in `dist/` has at least one valid JSON-LD
      block with `@context` and `@type`; required fields per type present; Organization on every
      page; SoftwareApplication with offers on `/` and `/pricing`; FAQPage where there are
      questions; HowTo on `/` and `/start`.
- [ ] `scripts/check-agents.mjs`: `/llms.txt`, `/llms-full.txt` exist; every page in the sitemap
      has a `.md` twin; `/facts.json` parses; `robots.txt` lists GPTBot, OAI-SearchBot,
      ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Bingbot; when indexing is
      off, `robots.txt` has `Disallow: /` and every page has `noindex`.
- [ ] `scripts/build-edge.mjs` parity: every line of `redirects.yaml` is present in both
      `_redirects` and `ops/nginx/redirects.conf`; every header of `headers.yaml` in both outputs.
- [ ] Lighthouse CI on `/`: performance, accessibility, best practices, SEO = 100 (desktop
      preset, 3 runs, median).
- [ ] Parity job: nginx image builds; `GET /` 200, one old URL 301, headers present.

## Manual, per screen

- [ ] Widths 320, 375, 768, 1024, 1280, 1920 px: no horizontal scroll, grids collapse as
      DESIGN.md says, text never overflows a card.
- [ ] Both themes: light, dark via device, dark via toggle; reload keeps the choice; no flash.
- [ ] Contrast ≥ 4.5:1 for body text in both themes (check `--fg-2` on `--surface-2`,
      `--band-fg-2` on `--band`, `--warn` on `--warn-soft`).
- [ ] Keyboard: every link and button reachable in order, visible focus ring (2px accent,
      offset 3px), skip link works, no focus trap, Escape closes nothing unexpectedly.
- [ ] Reduced motion: mesh, reveal, seat pop, countdown are static.
- [ ] No JS: page reads top to bottom, seat map rendered, calculator shows defaults, form posts
      and lands on `/start/thanks`.
- [ ] Screen reader pass (NVDA or VoiceOver): headings in order, one h1, landmarks `header`,
      `main`, `footer`, `nav` labelled, icon buttons labelled, decorative SVG hidden, the seat map
      has a text description.
- [ ] Copy against the prototype: every string identical (home) or from the owner (other
      pages); numbers only from `content/data`.
- [ ] Links: no `#` placeholders left; external links open in the same tab unless they are
      documentation; `Sign in` goes to app.arenasoldout.com.
- [ ] Fonts self-hosted, `font-display: swap`, no layout shift on load.
- [ ] Printing `/pricing` and `/facts` is readable.

## Translations (when a second language ships)

- [ ] `content/<lang>/pages/*` mirrors `content/en/pages/*`; missing files show English with
      the "not yet translated" note and `noindex`.
- [ ] `hreflang` and `x-default` present for every page, `dir` from config, RTL layout checked
      on a Hebrew stub.
- [ ] Dates, numbers and currency through `Intl` with the config locale.

## Launch day (apex switch)

- [ ] `indexing: true` in `site.config.ts`, deploy, `robots.txt` shows Allow for the agent list.
- [ ] Custom domains `arenasoldout.com` and `www.arenasoldout.com` on the Worker; `new.` removed.
- [ ] WordPress A-record moved to `demo.arenasoldout.com`.
- [ ] Old URLs from `redirects.yaml` return 301 on the apex; Search Console sitemap submitted.
- [ ] Cloudflare zone: AI crawler blocking off, Bot Fight Mode off (payment webhooks), SSL
      Full (strict), Always HTTPS on.
