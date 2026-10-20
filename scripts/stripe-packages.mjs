#!/usr/bin/env node
/**
 * Creates the prepaid packages in Stripe (products, USD and EUR prices, Payment Links) from
 * content/data/tariff.yaml and writes the links to content/data/package-links.yaml,
 * which the pricing page reads for its "Buy" buttons.
 *
 *   STRIPE_API_KEY=rk_test_... node scripts/stripe-packages.mjs            # dry run: prints what would be created
 *   STRIPE_API_KEY=rk_test_... node scripts/stripe-packages.mjs --apply    # creates in the TEST account
 *   STRIPE_API_KEY=rk_live_... node scripts/stripe-packages.mjs --apply --live
 *
 * Use a restricted key with write access to Products, Prices and Payment Links only. The key is read from the
 * environment and never written anywhere. Re-running is safe: products have fixed ids (arena_pkg_<name>), prices
 * are found by lookup_key, and a package whose link is already in the YAML file is skipped.
 *
 * Every Payment Link asks the payer for the e-mail the organization is registered with (required text field "organizer"). The value comes back in
 * the Checkout Session custom_fields; the package and the commission are in the session and payment metadata too,
 * so credits can be attached to the organization from the payment alone.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse, stringify } from 'yaml';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const key = process.env.STRIPE_API_KEY ?? '';
const live = key.startsWith('rk_live_') || key.startsWith('sk_live_');
const CURRENCIES = ['usd', 'eur'];
const OUT = new URL('../content/data/package-links.yaml', import.meta.url);
const tariff = parse(readFileSync(new URL('../content/data/tariff.yaml', import.meta.url), 'utf8'));

if (apply && !/^(rk|sk)_(test|live)_/.test(key)) { console.error('Set STRIPE_API_KEY to a restricted (rk_) or secret (sk_) key.'); process.exit(1); }
if (apply && live && !args.has('--live')) { console.error('This is a LIVE key. Add --live to create products and links in the live account.'); process.exit(1); }

/** Stripe wants form-encoded bodies with bracketed keys. */
function form(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? form(item, `${name}[${i}]`, out) : out.push([`${name}[${i}]`, String(item)])));
    else if (typeof v === 'object') form(v, name, out);
    else out.push([name, String(v)]);
  }
  return out;
}
async function api(method, path, body) {
  const url = `https://api.stripe.com/v1/${path}`;
  const res = await fetch(method === 'GET' && body ? `${url}?${new URLSearchParams(form(body))}` : url, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: method === 'POST' ? new URLSearchParams(form(body)) : undefined,
  });
  const json = await res.json();
  if (!res.ok) { const e = new Error(json.error?.message ?? res.statusText); e.code = json.error?.code; throw e; }
  return json;
}

/** The organizer field: it decides which organization the credits go to, so it must be the registered e-mail. Label max 50 chars. */
const FIELDS = [{ key: 'organizer', type: 'text', optional: false, label: { type: 'custom', custom: 'E-mail of your organization' }, text: { minimum_length: 5, maximum_length: 120 } }];
const CUSTOM_TEXT = { submit: { message: 'Enter the e-mail address your organization is registered with on ArenaSoldOut.com. The credits are added to the organization with this e-mail, so check it carefully. If you do not have an organization yet, enter the e-mail you will register with: the credits will be tied to it.' } };
const cents = (n) => Math.round(n * 100);
const links = existsSync(OUT) ? (parse(readFileSync(OUT, 'utf8'))?.links ?? {}) : {};
const symbol = { usd: 'US$', eur: '€' };

/** --sync: push the current field and text to the Payment Links already written to the YAML file. */
if (args.has('--sync')) {
  if (!apply) { console.error('--sync needs --apply'); process.exit(1); }
  const all = [];
  for (let after; ; ) { const r = await api('GET', 'payment_links', { limit: 100, ...(after ? { starting_after: after } : {}) }); all.push(...r.data); if (!r.has_more) break; after = r.data.at(-1).id; }
  for (const [name, byCur] of Object.entries(links)) for (const [cur, url] of Object.entries(byCur)) {
    const l = all.find((x) => x.url === url);
    if (!l) { console.log(`${name} ${cur}: not found in this account, skipped`); continue; }
    await api('POST', `payment_links/${l.id}`, { custom_fields: FIELDS, custom_text: CUSTOM_TEXT });
    console.log(`${name} ${cur}: updated`);
  }
  process.exit(0);
}

for (const p of tariff.packages) {
  const id = `arena_pkg_${p.name.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  console.log(`\nPackage ${p.name}: prepay ${p.prepay}, commission ${p.per_ticket} per ticket`);
  if (!apply) { CURRENCIES.forEach((c) => console.log(`  would create ${id} / ${c.toUpperCase()} ${symbol[c]}${p.prepay} + Payment Link${links[p.name]?.[c] ? ' (link exists, skipped)' : ''}`)); continue; }

  try {
    await api('POST', 'products', {
      id, name: `ArenaSoldOut.com prepaid package ${p.name}`,
      description: `Prepayment ${p.prepay}; commission ${p.per_ticket} per ticket without a seat, ${(p.per_ticket + tariff.package_seating_extra).toFixed(2)} with a seat. Never expires, spent only on ArenaSoldOut.com services.`,
      metadata: { arena_package: p.name, commission_per_ticket: p.per_ticket },
    });
    console.log(`  product ${id} created`);
  } catch (e) { if (e.code !== 'resource_already_exists') throw e; console.log(`  product ${id} exists`); }

  for (const cur of CURRENCIES) {
    if (links[p.name]?.[cur]) { console.log(`  ${cur.toUpperCase()}: link exists, skipped`); continue; }
    const lookup = `${id}_${cur}`;
    let price = (await api('GET', 'prices', { lookup_keys: [lookup], active: true })).data[0];
    if (!price) price = await api('POST', 'prices', { product: id, currency: cur, unit_amount: cents(p.prepay), lookup_key: lookup, metadata: { arena_package: p.name } });
    const meta = { arena_package: p.name, commission_per_ticket: p.per_ticket, prepay: p.prepay, currency: cur };
    const link = await api('POST', 'payment_links', {
      line_items: [{ price: price.id, quantity: 1 }],
      custom_fields: FIELDS,
      custom_text: CUSTOM_TEXT,
      metadata: meta,
      payment_intent_data: { metadata: meta, description: `ArenaSoldOut.com prepaid package ${p.name}` },
    });
    (links[p.name] ??= {})[cur] = link.url;
    console.log(`  ${cur.toUpperCase()}: ${link.url}`);
    writeFileSync(OUT, header(live) + stringify({ links }));
  }
}
if (!apply) console.log('\nDry run. Nothing was created. Add --apply to create.');

function header(isLive) {
  return `# Stripe Payment Links of the prepaid packages, one per package and currency. Written by scripts/stripe-packages.mjs.\n# A package without a link shows "Talk to us" instead of "Buy" on the pricing page. Mode of the last run: ${isLive ? 'LIVE' : 'TEST'}.\n`;
}
