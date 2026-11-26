// Which Twenty card does this subscription belong to?
//  1. the card of the e-mail contact code `cid` (an outreachSend with that contactCode points at its person), so a
//     reader who came from a letter is linked to the card we already hold, whatever address they typed;
//  2. otherwise the card whose primary or additional e-mail IS the typed address (the filter is a case-insensitive
//     pattern, so the match is repeated here exactly);
//  3. otherwise none: a new card is created.
const p = $('Prepare').first().json;
const list = (node, key) => (((($(node).first() || { json: {} }).json || {}).data || {})[key]) || [];
const sends = list('Twenty: send by cid', 'outreachSends');
const people = list('Twenty: person by email', 'people');
const mail = (x) => String((x.emails && x.emails.primaryEmail) || '').toLowerCase();
const same = (x) => mail(x) === p.email || (x.emails && Array.isArray(x.emails.additionalEmails) && x.emails.additionalEmails.some((e) => String(e).toLowerCase() === p.email));
const byEmail = people.find(same) || null;
const cidPersonId = p.cid && sends.length && sends[0].personId ? String(sends[0].personId) : '';
let existing = byEmail;
let fetchId = '';
if (cidPersonId && !(byEmail && byEmail.id === cidPersonId)) { existing = null; fetchId = cidPersonId; }
return [{ json: { needFetch: fetchId ? 'yes' : 'no', fetchId, existing, fallback: byEmail, cidBound: Boolean(cidPersonId) } }];
