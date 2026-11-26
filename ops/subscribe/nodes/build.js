// Decide create / update / already-confirmed and build the Twenty body. A subscription never touches the cold-mail
// fields (outreachStatus, doNotContact, emailBounced, ...): the warm list is a separate stream.
const p = $('Prepare').first().json;
const pk = $('Pick').first().json;
const j = $input.first().json;
const card = (pk.needFetch === 'yes' ? ((j.data && j.data.person) || pk.fallback) : pk.existing) || null;
const lower = (v) => String(v || '').toLowerCase();
const sameAddr = card && (lower(card.subscriptionEmail) === p.email || lower(card.emails && card.emails.primaryEmail) === p.email);
// Already confirmed on this address: nothing to change and no second letter. The visitor sees the same "check your inbox" answer.
const mode = !card ? 'create' : (card.subscriptionStatus === 'CONFIRMED' && sameAddr ? 'already' : 'update');
const tags = Array.from(new Set([...(card && Array.isArray(card.tags) ? card.tags : []), 'SUBSCRIBER']));
const LANG1 = { ru: 'RU', en: 'EN', es: 'ES', de: 'DE', fr: 'FR', uk: 'UK', cs: 'CS', no: 'NO' };
const body = {
  subscriptionStatus: 'PENDING', subscriptionEmail: p.email, subscriptionSource: p.source, subscriptionLanguage: p.lang,
  subscriptionConsentAt: p.receivedAt, subscriptionConsentText: p.consent, subscriptionToken: p.token,
  subscriptionUtm: Object.keys(p.utm).length ? JSON.stringify(p.utm) : '', subscriptionPage: p.page,
  subscriptionConfirmedAt: null, subscriptionUnsubscribedAt: null, tags,
};
if (mode === 'create') {
  body.name = { firstName: '', lastName: '' };
  body.emails = { primaryEmail: p.email };
  if (LANG1[p.lang]) body.language1 = LANG1[p.lang];
}
return [{ json: { mode, id: card ? card.id : '', body, cidBound: pk.cidBound } }];
