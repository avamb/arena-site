# Subscription form: back end (n8n + Twenty + Brevo)

The popup and the footer line on arenasoldout.com post to the Worker (`worker/subscribe.ts`), which checks Turnstile and the
honeypot, makes a random token and calls the n8n webhook **Arena site: subscribe** (id `Ax5T0ZBCl5iieOJZ`,
`https://n8.andreevmaster.com/webhook/arena-site-subscribe`, header `X-Arena-Site-Token`).

| File | What it is |
|---|---|
| `build_workflow.py` + `nodes/*.js` | source of the workflow: `python ops/subscribe/build_workflow.py` writes `workflow_subscribe.json` (n8n holds the live copy) |
| `test_nodes.cjs` | offline test of the Code nodes (no network): `node ops/subscribe/test_nodes.cjs` |
| `subscribe_schema.py` | the person fields in Twenty, dry run by default, `--apply` creates (applied 17.11.2026) |

## Flow

* **subscribe**: find the Twenty person by the e-mail contact code `cid` (an `outreachSend` with that `contactCode` points at its
  person), else by the exact e-mail, else create one. Fields: `subscriptionStatus` PENDING, `subscriptionEmail`,
  `subscriptionSource` (`popup` or `footer`), `subscriptionLanguage`, `subscriptionConsentAt`, `subscriptionConsentText`
  (version of the consent line, `site.config.ts` `subscribe.consentVersion`), `subscriptionToken`, `subscriptionUtm`,
  `subscriptionPage`, tag `SUBSCRIBER` added to `tags`. Then the confirmation letter from `noreply@arenasoldout.com` through the
  Brevo API (main domain: the warm stream, never `arenasoldout.org`, which carries cold mail).
* **confirm**: `/subscribe/confirm?t=<token>` posts the token; PENDING becomes CONFIRMED (a request older than 14 days is
  refused as expired). **unsubscribe**: the page asks for a click, then CONFIRMED or PENDING becomes UNSUBSCRIBED.
* The subscription never touches the cold-mail fields (`outreachStatus`, `doNotContact`, `emailBounced`); a person created by the
  form has no `outreachStatus`, so the cold workflow does not pick it.
* An address already CONFIRMED answers the same "check your inbox" and sends nothing.
* The token stays on the card after the confirmation: every later letter of the warm stream needs a working unsubscribe link
  (`https://arenasoldout.com/subscribe/unsubscribe?t=<token>`, plus the `List-Unsubscribe` header).

## Worker secrets (once, `npx wrangler secret put <NAME>`)

`SUBSCRIBE_WEBHOOK_URL`, `SUBSCRIBE_WEBHOOK_TOKEN` (the credential "Arena site subscribe token" in n8n; the value is kept in
`arena-site-secrets/subscribe-webhook.env`, outside the repo). `TURNSTILE_SECRET_KEY` is shared with `/api/contact`. Without them
the endpoints answer 503 and the form shows the "not available" message.

## Not built here

The digest itself (the letters every two weeks) and a Brevo/Twenty send flow for CONFIRMED subscribers. Anything that sends to
this list must use only `subscriptionStatus = CONFIRMED`, the main domain and carry the unsubscribe link of the card's token.
