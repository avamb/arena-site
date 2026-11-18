# Blog article template (new articles, from 19.11.2026)

`npm run check:posts` enforces the rules marked (check). Copy rules of the site apply as everywhere
(`check:anti-slop`): no em dash, no "!", no hype words, "commission" not "our fee", ArenaSoldOut.com only.

## File

`content/<lang>/posts/<slug>.md`, slug short (3-6 words) in the article's language. Cover at
`content/<lang>/posts/images/<slug>/cover.jpg` (1200 px wide or more).

```yaml
---
title: "At most 60 characters, with the search term"            # (check) 1-60
description: "The direct answer to the article's question."       # (check) 70-160
date: 2026-11-19
author: marina-bakanova
cover: ./images/<slug>/cover.jpg                                  # (check) required
cover_alt: "What the cover shows, one sentence"                   # (check) required
tags: [pricing]
related:                                                          # optional, defaults: pricing, sell, start
  - { label: "Seating plans", href: /product/seating }
---
```

## Body

1. No `# ` heading: the title is the page's H1.
2. First paragraph answers the question of the title in 2-3 sentences. LLMs and search quote it.
3. 3-6 sections under `## `, concrete: steps, examples, what the platform does today (check the pages
   in `content/en/pages/`, never promise what they do not say).
4. At least 2 internal links with descriptive text (check): `/pricing`, `/product/...`, `/solutions/...`, `/start`.
5. No prices in the text (check): prices come from `content/data/` and change; link `/pricing`.
6. FAQ at the end (check), heading exactly as `post.faq` in `i18n/<lang>.json`
   (en "Frequently asked questions", ru "Частые вопросы", es "Preguntas frecuentes", ...):
   3-5 items, `### Question?` then a 1-3 sentence answer. It becomes FAQPage in JSON-LD.
7. 800-1500 words.

## Translations

The English text is approved first. Translators follow `docs/i18n/TRANSLATION-BRIEF.md` (terms, address,
money format, search term per language for the title) and keep the structure: same sections, same links
(hrefs unchanged), same FAQ items, localized slug. Then one line in `postGroups` in
`src/lib/translations.ts` with every language of the article, so hreflang links them.
