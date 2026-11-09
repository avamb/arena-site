# Translation brief: arenasoldout.com

For whoever translates the site (people or model agents). Owner's decision of 09.11.2026: wave 1 is
es, pt (Brazilian), de, fr, it, pl, uk, ru. Wave 2 later: nl, ro, cs, he, no.

## What to translate, and where it goes

| English original | Translation |
|---|---|
| `content/en/pages/**/*.yaml` (38 files) | `content/<lang>/pages/` with the same path and file name |
| `content/data/nav.yaml` (header and footer) | `content/<lang>/nav.yaml` |
| `i18n/en.json` (interface strings) | `i18n/<lang>.json` (merge into the file if it exists) |

Do not touch `content/en/`, `content/data/`, blog posts (`content/*/posts/`) or any code.
An existing `content/ru/pages/blog.yaml` is already translated: leave it.

## Structure must stay identical (CI checks it)

- Same YAML keys, same nesting, same number of items in every list, same order. Translate values only.
- Keep these values exactly as in English: `type`, `id`, `icon`, every `href`, URLs, e-mail addresses,
  code blocks, `order`, numbers in data fields, `widget`/`visual` data keys.
- `{placeholders}` such as `{percent}`, `{usdPrice}`, `{saving}`, `{lowMax}` stay exactly as they are,
  each one as many times as in the original. Never put a number in place of a placeholder.
- Markdown inside values stays: `**bold**`, `[link text](/href)` (translate the text, keep the href).
- YAML comments (`# ...`) may be dropped.
- In `i18n/<lang>.json`, keep the keys; objects of `Intl` options (like `post.date`) stay as they are.
- Quote a value with double quotes when it contains a colon followed by a space, `#`, or starts with
  a special character, exactly as YAML requires. The file must parse.

## Never translate or change

- **ArenaSoldOut.com** is the only form of the name: never "Arena Sold Out", never "ArenaSoldOut" without
  ".com", never declined or inflected (ru/uk/pl: "в ArenaSoldOut.com", "с ArenaSoldOut.com").
- Product and partner names: Event Center, MACS, Stripe, Flitt, AllPay, Telegram, Ticket Tailor,
  Cloudflare, Tilda, Wix, Webflow, App Store, Google Play, ABH TEAM OÜ.
- Domains: tickets.arenasoldout.com, go.arenasoldout.com, app.arenasoldout.com.
- Button label "Tickets: ArenaSoldOut.com" in the white-label line: translate "Tickets", keep the name.

## Site rules that the checks enforce in every language

- **No em dash (—).** Use a colon, a comma, parentheses or a new sentence. (En dash in number ranges
  like 5–10 is fine.) This matters most in ru, uk, pl, fr where the em dash is usual typography.
- **No exclamation marks.**
- No hype words (the equivalents of elevate, unlock, seamless, revolutionary, next-level).
- No promises the platform does not make: waitlists, access codes, Apple or Google Wallet, tax invoices,
  an app for buyers, buyer accounts, "best available seats", self-service signup without the team.
- Plain, direct, concrete. Short sentences. Facts and numbers over adjectives. The reader is an event
  organizer or a venue manager deciding where to sell tickets.

## Address and tone per language

| Lang | Address | Notes |
|---|---|---|
| es | tú | Neutral Spanish for Spain and Latin America: avoid vosotros and regionalisms. |
| pt | você | Brazilian Portuguese. |
| de | Sie | |
| fr | vous | Non-breaking space before : ; ? is fine but not required. |
| it | tu | |
| pl | Ty (capitalised is not needed: "ty", or impersonal forms) | |
| uk | ви | Ukrainian, not Russian calques. |
| ru | вы (lower case) | |

## Terms (use the same word everywhere in one language)

| English | es | pt | de | fr | it | pl | uk | ru |
|---|---|---|---|---|---|---|---|---|
| credits | créditos | créditos | Credits | crédits | crediti | kredyty | кредити | кредиты |
| credit pack | paquete de créditos | pacote de créditos | Credit-Paket | pack de crédits | pacchetto di crediti | pakiet kredytów | пакет кредитів | пакет кредитов |
| pay as you go | pago por uso | pague conforme usa | Pay as you go (Zahlung nach Verkauf) | paiement à l'usage | paghi a consumo | płatność za sprzedane bilety | оплата за фактом | оплата по факту |
| commission (our charge per ticket) | comisión | comissão | Provision | commission | commissione | prowizja | комісія | комиссия |
| service fee (organizer's, paid by buyer) | cargo por servicio | taxa de serviço | Servicegebühr | frais de service | commissione di servizio | opłata serwisowa | сервісний збір | сервисный сбор |
| organizer | organizador | organizador | Veranstalter | organisateur | organizzatore | organizator | організатор | организатор |
| venue | recinto | local | Spielstätte | salle | struttura | obiekt | майданчик | площадка |
| seating plan | plano de asientos | mapa de assentos | Saalplan | plan de salle | mappa dei posti | plan sali | схема залу | схема зала |
| sales page | página de venta | página de vendas | Verkaufsseite | page de vente | pagina di vendita | strona sprzedaży | сторінка продажу | страница продаж |
| ticket widget | widget de entradas | widget de ingressos | Ticket-Widget | widget de billetterie | widget dei biglietti | widget biletowy | віджет квитків | виджет билетов |
| payment account | cuenta de pagos | conta de pagamentos | Zahlungskonto | compte de paiement | conto di pagamento | konto płatności | платіжний акаунт | платёжный аккаунт |
| promo code | código promocional | código promocional | Promo-Code | code promo | codice promozionale | kod promocyjny | промокод | промокод |
| invitation (free ticket) | invitación | convite | Freikarte | invitation | invito | zaproszenie | запрошення | пригласительный |
| registered charity | organización benéfica registrada | entidade beneficente registrada | eingetragene gemeinnützige Organisation | association caritative enregistrée | ente benefico registrato | zarejestrowana organizacja charytatywna | зареєстрована благодійна організація | зарегистрированная благотворительная организация |
| white label | white label | white label | White Label | marque blanche | white label | white label | white label | white label |
| ticket (event) | entrada | ingresso | Ticket | billet | biglietto | bilet | квиток | билет |

## Money in running text

Keep the amount and currency as in English, write the decimal separator of the language
(US$0.59 becomes US$0,59 in es, pt, de, fr, it, pl, uk, ru). Do not convert currencies.
Amounts produced by `{placeholders}` and tables are formatted by the site.

## SEO

- `title` at most 60 characters, `description` at most 160 characters, both natural in the language,
  with the term people search for: es "venta de entradas", pt "venda de ingressos", de "Ticketverkauf",
  fr "billetterie", it "vendita biglietti", pl "sprzedaż biletów", uk "продаж квитків",
  ru "продажа билетов". Keep "ArenaSoldOut.com" in titles where the English title has it.
- On `tickettailor-alternative.yaml` keep "Ticket Tailor" and the word for "alternative" in the title.
- `h1` short and specific, like the English one.

## Legal pages

`legal/terms.yaml` and `legal/privacy.yaml`: translate faithfully, no rewording. At the end of the
`lead` value add one sentence in the language: "This is a translation for information; the English
version is binding." Do not add keys.

## Check before handing over

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
node scripts/check-i18n.mjs
node scripts/check-anti-slop.mjs
```

Both must report no problem for your language (lines about other languages being "not translated"
are information, not errors).
