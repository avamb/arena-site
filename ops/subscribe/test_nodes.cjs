// Offline test of the Code nodes of "Arena site: subscribe" against hand-made inputs (no n8n, no Twenty, no Brevo).
//   node ops/subscribe/test_nodes.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function run(file, input, nodes = {}) {
  const src = fs.readFileSync(path.join(__dirname, 'nodes', file), 'utf8');
  const $ = (name) => ({ first: () => ({ json: nodes[name] || {} }) });
  return new Function('$input', '$', src)({ first: () => ({ json: input }) }, $)[0].json;
}

const TOKEN = 'a'.repeat(32);
const sub = { action: 'subscribe', email: 'Anna@Example.com', lang: 'ru', source: 'popup', page: '/ru/pricing', consent: '2026-11-17', utm: { source: 'fb', junk: 'x' }, cid: 'abcdefghjk', token: TOKEN, received_at: '2026-11-17T10:00:00.000Z' };

// prepare
let p = run('prepare.js', { body: sub });
assert.equal(p.route, 'subscribe'); assert.equal(p.email, 'anna@example.com'); assert.deepEqual(p.utm, { source: 'fb' }); assert.equal(p.cid, 'abcdefghjk');
assert.equal(run('prepare.js', { body: { ...sub, email: 'a"b@x.com' } }).route, 'bad');
assert.equal(run('prepare.js', { body: { ...sub, token: 'x' } }).route, 'bad');
assert.equal(run('prepare.js', { body: { action: 'hack' } }).route, 'bad');
assert.equal(run('prepare.js', { body: { action: 'confirm', token: TOKEN } }).route, 'token');
assert.equal(run('prepare.js', { body: { ...sub, lang: 'xx', source: 'x', page: '//evil' } }).lang, 'en');

// pick: cid wins, then exact e-mail, otherwise none
const mk = (sends, people) => ({ 'Prepare': p, 'Twenty: send by cid': { data: { outreachSends: sends } }, 'Twenty: person by email': { data: { people } } });
const byMail = { id: 'p1', emails: { primaryEmail: 'ANNA@example.com' } };
const other = { id: 'p2', emails: { primaryEmail: 'anna_@example.com' } }; // a LIKE pattern would match this
let k = run('pick.js', {}, mk([], [other, byMail]));
assert.deepEqual([k.needFetch, k.existing.id, k.cidBound], ['no', 'p1', false]);
k = run('pick.js', {}, mk([{ personId: 'p9' }], [byMail]));
assert.deepEqual([k.needFetch, k.fetchId, k.existing, k.fallback.id, k.cidBound], ['yes', 'p9', null, 'p1', true]);
k = run('pick.js', {}, mk([{ personId: 'p1' }], [byMail]));
assert.deepEqual([k.needFetch, k.existing.id], ['no', 'p1']);
k = run('pick.js', {}, mk([], [other]));
assert.equal(k.existing, null);

// build
const bn = (pick, input = {}) => run('build.js', input, { Prepare: p, Pick: pick });
let b = bn({ needFetch: 'no', existing: null, cidBound: false });
assert.equal(b.mode, 'create'); assert.equal(b.body.emails.primaryEmail, 'anna@example.com'); assert.equal(b.body.language1, 'RU');
assert.deepEqual(b.body.tags, ['SUBSCRIBER']); assert.equal(b.body.subscriptionStatus, 'PENDING'); assert.equal(b.body.subscriptionToken, TOKEN);
assert.equal(b.body.subscriptionUtm, '{"source":"fb"}');
b = bn({ needFetch: 'no', existing: { id: 'p1', emails: { primaryEmail: 'anna@example.com' }, tags: ['MARINA_2024'], subscriptionStatus: 'CONFIRMED' } });
assert.equal(b.mode, 'already');
b = bn({ needFetch: 'no', existing: { id: 'p1', emails: { primaryEmail: 'anna@example.com' }, tags: ['MARINA_2024', 'SUBSCRIBER'], subscriptionStatus: 'UNSUBSCRIBED' } });
assert.equal(b.mode, 'update'); assert.deepEqual(b.body.tags, ['MARINA_2024', 'SUBSCRIBER']); assert.ok(!('name' in b.body) && !('emails' in b.body));
b = bn({ needFetch: 'yes', fallback: null, cidBound: true }, { data: { person: { id: 'p9', emails: { primaryEmail: 'old@x.com' }, tags: [] } } });
assert.equal(b.mode, 'update'); assert.equal(b.id, 'p9'); assert.ok(!('emails' in b.body), 'the card keeps its own primary e-mail');
b = bn({ needFetch: 'yes', fallback: null, cidBound: true }, { error: { message: 'gone' } });
assert.equal(b.mode, 'create', 'a cid card that cannot be read falls back to a new card');

// mail
let m = run('mail.js', {}, { Prepare: p }).brevo;
assert.equal(m.sender.email, 'noreply@arenasoldout.com'); assert.equal(m.to[0].email, 'anna@example.com');
assert.ok(m.htmlContent.includes('https://arenasoldout.com/ru/subscribe/confirm?t=' + TOKEN));
assert.ok(m.htmlContent.includes('/ru/subscribe/unsubscribe?t=' + TOKEN)); assert.ok(m.headers['List-Unsubscribe'].includes('unsubscribe?t=' + TOKEN));
assert.ok(m.subject.includes('Подтвердите'));
m = run('mail.js', {}, { Prepare: { ...p, lang: 'cs' } }).brevo;
assert.ok(m.htmlContent.includes('https://arenasoldout.com/subscribe/confirm?t='), 'cs has no menu page: English path');
assert.equal(m.subject, 'Confirm your subscription');

// decide
const dn = (action, card) => run('decide.js', { data: { people: card ? [card] : [] } }, { Prepare: { action, token: TOKEN } });
const pend = { id: 'p1', subscriptionToken: TOKEN, subscriptionStatus: 'PENDING', subscriptionLanguage: 'de', subscriptionConsentAt: new Date().toISOString() };
let d = dn('confirm', pend);
assert.deepEqual([d.code, d.patch, d.change.subscriptionStatus, d.body.lang], [200, 'yes', 'CONFIRMED', 'de']);
assert.equal(dn('confirm', null).code, 404);
assert.equal(dn('confirm', { ...pend, subscriptionToken: 'other' }).code, 404);
assert.equal(dn('confirm', { ...pend, subscriptionConsentAt: new Date(Date.now() - 15 * 86400000).toISOString() }).code, 410);
assert.deepEqual([dn('confirm', { ...pend, subscriptionStatus: 'CONFIRMED' }).code, dn('confirm', { ...pend, subscriptionStatus: 'CONFIRMED' }).patch], [200, 'no']);
assert.equal(dn('confirm', { ...pend, subscriptionStatus: 'UNSUBSCRIBED' }).code, 404);
d = dn('unsubscribe', { ...pend, subscriptionStatus: 'CONFIRMED' });
assert.deepEqual([d.code, d.patch, d.change.subscriptionStatus], [200, 'yes', 'UNSUBSCRIBED']);
assert.equal(dn('unsubscribe', { ...pend, subscriptionStatus: 'UNSUBSCRIBED' }).patch, 'no');

// workflow file: every connection points at an existing node, credentials by id only
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflow_subscribe.json'), 'utf8'));
const names = new Set(wf.nodes.map((n) => n.name));
for (const [from, o] of Object.entries(wf.connections)) { assert.ok(names.has(from), from); for (const out of o.main) for (const c of out) assert.ok(names.has(c.node), c.node); }
console.log('subscribe workflow nodes: all checks passed');
