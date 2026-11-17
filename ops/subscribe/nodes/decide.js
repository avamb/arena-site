// Confirm or unsubscribe by token. The token is the bearer secret of the link; it stays on the card after the
// confirmation so that every later letter can carry a working unsubscribe link. Answers are decided here and sent by
// "Respond result": code + body; `patch` says whether Twenty must be changed first.
const p = $('Prepare').first().json;
const people = ((($input.first().json || {}).data || {}).people) || [];
const card = people.find((x) => x.subscriptionToken === p.token) || null;
const DAY = 86400000;
const answer = (code, body, patch) => [{ json: { code, body, patch: patch ? 'yes' : 'no', id: card ? card.id : '', change: patch || {} } }];
if (!card) return answer(404, { error: 'token' });
const lang = card.subscriptionLanguage || 'en';
const now = new Date().toISOString();
const st = card.subscriptionStatus;
if (p.action === 'confirm') {
  if (st === 'CONFIRMED') return answer(200, { ok: true, lang });
  if (st !== 'PENDING') return answer(404, { error: 'token' });
  const asked = Date.parse(card.subscriptionConsentAt || '');
  if (!(asked > 0) || Date.now() - asked > 14 * DAY) return answer(410, { error: 'expired' });
  return answer(200, { ok: true, lang }, { subscriptionStatus: 'CONFIRMED', subscriptionConfirmedAt: now });
}
if (st === 'UNSUBSCRIBED') return answer(200, { ok: true, lang });
return answer(200, { ok: true, lang }, { subscriptionStatus: 'UNSUBSCRIBED', subscriptionUnsubscribedAt: now });
