# arenasoldout.com

Marketing site of Arena Sold Out: Astro 5 (static), Tailwind 4 utilities, Svelte 5 islands,
content in YAML/Markdown, deployed to Cloudflare Workers Static Assets and buildable as an
nginx image without changes. Architecture and decisions: `design/33_arenasoldout_marketing_site_ru.md`.
Standards that every screen follows: `UX-DECISIONS.md`, `PRD.md`, `DESIGN.md`, `QA-CHECKLIST.md`.

## Run locally

```bash
npm install
npm run dev
```

Opens `http://localhost:4321`. `npm run build` writes `dist/` plus `_redirects`, `_headers` and the
nginx includes; `npm run preview` serves the build. `npm run check` runs every CI check
(types, anti-slop grep, translation parity, redirects/headers parity, JSON-LD, agent files).
`npm run forms:test` tests the form handler; `npm run forms:dev` runs it on `http://localhost:8787`.

Requirements: Node 22, npm 10. Lighthouse locally: `npm run lhci` (needs Chrome).

## Edit texts

Every text is a file; no component contains prose (doc 33 §3.8).

| What | Where |
|---|---|
| Home page copy, section order | `content/en/pages/home.yaml` |
| Inner pages (pricing, payments, developers, clients, facts, blog, changes, start) | `content/en/pages/<page>.yaml` |
| Detailed pricing terms | `content/en/pages/pricing/terms.yaml` |
| Prices per currency | `content/data/pricing/<region>.yaml` |
| Venues percent, invoicing, calculator defaults | `content/data/tariff.yaml` |
| Payment providers, markets | `content/data/providers/*.yaml`, `content/data/markets/*.yaml` |
| Latest changes (one file per entry) | `content/data/changelog/<date>.yaml` |
| Clients wordmarks, track record | `content/data/clients.yaml` |
| Facts table (`/facts`, `facts.json`) | `content/data/facts.yaml` |
| Header, footer, tagline, copyright | `content/data/nav.yaml` |
| Interface strings (buttons, labels) | `i18n/en.json` |
| Blog posts | `content/<lang>/posts/<slug>.md` (frontmatter + Markdown; `draft: true` hides; images next to the post in `images/<slug>/`) |
| Legal pages (terms, privacy) | `content/en/pages/legal/*.yaml` (transferred from the previous site, under review) |
| Product, solutions, company pages | `content/en/pages/product/*.yaml`, `solutions/*.yaml`, `company.yaml`, `contact.yaml`, `partners.yaml`, `help/tickets.yaml` |
| "Read next" links of a page | `related:` list at the top of the page YAML (label, href, optional text) |

Inline marks allowed inside YAML strings: `**bold**` and `[text](href)`. Nothing else is interpreted.
Small fix without a laptop: open the file on GitHub, press the pencil, edit, "Commit changes" to
`main`. CI builds and deploys in about five minutes; if a check fails (for example a banned word),
the deploy does not happen and the Actions log says why. Adding a page: a new YAML in
`content/en/pages/`, it appears in the sitemap, `llms.txt` and gets a Markdown twin automatically.
Keystatic can be attached later with one config file; every collection already has a zod schema
in `src/content.config.ts`.

Adding a language (doc 33 §3.6): one line in `site.config.ts` (`inMenu: true`) and a folder
`content/<code>/` mirroring `content/en/`; untranslated pages show English with a note and `noindex`.
Adding a provider or a market (doc 33 §3.9): one YAML file; the home page, `/payments`, `/start`
and `facts.json` follow.

## Blog archive and redirects

The 75 posts of the previous WordPress site (en 30, ru 43, es 1, no 1) were imported with
`npm run import:wordpress` (`scripts/import-wordpress.mjs`): REST API to Markdown, images downloaded
next to the post, internal links rewritten to the new addresses, the old address kept as `legacy_url`.
Texts are not edited (archive policy): every imported post shows a "From the archive" note linking to
the changes page. Russian posts live under `/ru/blog/<slug>`; Russian is not in the menu yet, so only
the blog index and the posts exist in Russian and every other link on those pages goes to English.

Redirects: `redirects.yaml` holds the old pages (71 pages, shop, categories, tags); every post's 301 is
derived from its `legacy_url` by `scripts/lib/legacy.mjs`, including the pre-WPML addresses without the
`/ru/` prefix. `npm run check:links` verifies that every internal link and every redirect target exists.

Internal linking (SEO): breadcrumbs on every inner page (visible and as BreadcrumbList), a "Read next"
block from `related:` before the final CTA, product and solution pages cross-linked in their cards and
FAQ answers, blog posts with "Read next" (newest posts) and "Related pages" (product pages), home
"Who it is for" cards linking to the solution pages, footer with product, solutions, company and legal.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/ci.yml`): build and checks → Lighthouse (all
four categories 100 on `/` and `/pricing`) → nginx image parity smoke → `wrangler deploy` with the
repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The Worker `arena-site`
serves `dist/` as static assets and runs `forms/worker.ts` for `/api/*` only.

Manual deploy from a machine with the token in the environment:

```bash
npm run build
npx wrangler deploy
```

Worker secrets (same names as `.env.example`), set once:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put FORMS_WEBHOOK_URL
```

Turnstile: the site key is public and lives in `site.config.ts` (`turnstileSiteKey`); empty means the
widget is off and the handler skips verification. The n8n webhook URL is `FORMS_WEBHOOK_URL`; while it
is empty the handler accepts applications and logs them.

### Own server instead of Cloudflare (doc 33 §3.7a)

The same `dist/` builds into an nginx image on every push (`ops/nginx/Dockerfile`, job `parity`).
To move: build the two images, run them in Dokploy on lead-parser, point the DNS A-record at the
server (domain stays proxied by Cloudflare), done. Redirects and headers come from
`redirects.yaml` and `headers.yaml` in both worlds.

```bash
npm run build
docker build -f ops/nginx/Dockerfile -t arena-site .
docker build -f ops/forms/Dockerfile -t arena-site-forms .
docker run -d -p 8787:8787 --env-file .env arena-site-forms
docker run -d -p 8080:8080 -e FORMS_UPSTREAM=host.docker.internal:8787 arena-site
```

## Launch day: switch the domain to the apex

Today the site lives on `new.arenasoldout.com` with `noindex` and `robots.txt` `Disallow: /`.
WordPress stays on the apex. To switch (doc 33 §3.7b), one pull request:

1. `site.config.ts`: `indexing` → `true` (or set `SITE_INDEXING: 'true'` in `ci.yml`).
   `siteUrl` default → `https://arenasoldout.com`; `ci.yml` `SITE_URL` the same.
2. `wrangler.toml` `routes`: replace `new.arenasoldout.com` with
   `{ pattern = "arenasoldout.com", custom_domain = true }` and
   `{ pattern = "www.arenasoldout.com", custom_domain = true }`.
3. In Cloudflare DNS, move the WordPress A-record from the apex to `demo.arenasoldout.com` first
   (the custom domain refuses to attach while an A-record exists on the apex); `www` may need its
   old record removed too.
4. Merge. The deploy creates the custom domains and certificates; `_redirects` from
   `redirects.yaml` start answering old WordPress addresses with 301.
5. Check: `https://arenasoldout.com/` 200, `robots.txt` lists the AI agents and the sitemap,
   `curl -I https://arenasoldout.com/prices/` → 301 `/pricing`, Search Console: submit
   `sitemap-index.xml`. Zone settings: AI crawler blocking off, Bot Fight Mode off, SSL Full
   (strict), Always HTTPS.
6. Rollback: revert the pull request; the custom domain goes back to `new.` within minutes.

What a launch build (`SITE_URL=https://arenasoldout.com`, indexing on) does by itself, nothing to configure:

- canonical, `og:url`, hreflang, sitemap and JSON-LD all use the apex; `index, follow` replaces `noindex`,
  the `X-Robots-Tag: noindex` header disappears, `robots.txt` lists the sitemap;
- every page has an Open Graph and Twitter card (`public/brand/og-default.png`, 1200x630; posts use their
  own cover), `apple-touch-icon`, `og:site_name`;
- `https://www.arenasoldout.com/*` and `https://new.arenasoldout.com/*` answer 301 to the apex with the path kept
  (first lines of `dist/_redirects`; keep `new.` attached to the Worker as a custom domain for this);
- 168 of 168 addresses of the old WordPress sitemaps are covered by a page or a 301 (`/prices/`, `/sitemap.xml`,
  product and category taxonomies, feeds, 75 blog posts via `legacy_url`).

Before the merge: re-run the old-sitemap audit (fetch `https://arenasoldout.com/sitemap.xml`, check every URL against
`dist/_redirects` and `dist/`); after it: Search Console and Bing Webmaster (add the apex property, submit
`sitemap-index.xml`, use "Change of address" only if the property was under another host), check
`curl -I https://www.arenasoldout.com/pricing` → 301 to the apex, `curl -I https://new.arenasoldout.com/` → 301,
the Turnstile widget lists `arenasoldout.com`, and paste a page into a link preview tester for the card.

## Repository map

```
content/            all texts and data (YAML, Markdown)
i18n/               interface strings per language
src/content.config.ts   zod schemas = editor fields
src/pages/          one catch-all route per page + .md twins, llms.txt, facts.json, robots.txt
src/components/     header, footer, icons, sections (data in, HTML out), Svelte islands
src/styles/         tokens.css (both themes), components.css (prototype CSS), global.css
forms/              Hono form handler: app.ts, worker.ts (Cloudflare), server-node.ts (container)
scripts/            build-edge (redirects/headers), check-* (CI gates)
ops/nginx, ops/forms   Dockerfiles and nginx config for the self-hosted variant
redirects.yaml, headers.yaml   single source for Cloudflare and nginx
wrangler.toml       Worker config (no secrets)
design/             brief, prototype, brand vectors, doc 33, anti-slop catalog
```
