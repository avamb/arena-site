import test from 'node:test';
import assert from 'node:assert/strict';
import { coerce, collectUtm, countryOptions, emailOk, failureMessage, fieldMessage, fill, parseFailure, phoneOk, stepOfField, type Field } from './onboarding-lib.ts';

const f = (type: string, extra: Partial<Field> = {}): Field => ({ key: 'k', type, label: 'L', required: false, ...extra });

test('coerce: bool, multiselect, url_list, number', () => {
  assert.equal(coerce(f('bool'), true), true);
  assert.equal(coerce(f('bool'), false), false);
  assert.deepEqual(coerce(f('multiselect'), ['a', 'b']), ['a', 'b']);
  assert.deepEqual(coerce(f('url_list', { max_items: 2 }), 'https://a.com\nhttps://b.com, https://c.com'), ['https://a.com', 'https://b.com']);
  assert.equal(coerce(f('number'), '12,5'), 12.5);
  assert.equal(coerce(f('number'), ''), '');
  assert.equal(coerce(f('text'), '  hi '), 'hi');
});

test('parseFailure reads the platform error envelope', () => {
  const body = { error: { code: 'onboarding.invalid_field', details: { fields: { phone: 'invalid', org_name: 'required' } } } };
  assert.deepEqual(parseFailure(422, body), { status: 422, code: 'onboarding.invalid_field', fields: { phone: 'invalid', org_name: 'required' } });
  assert.deepEqual(parseFailure(500, null), { status: 500, code: 'http.500', fields: {} });
  assert.deepEqual(parseFailure(422, { error: { code: 'onboarding.incomplete', details: { fields: ['a', 'b'] } } }).fields, { a: 'required', b: 'required' });
});

test('messages fall back to the generic ones', () => {
  const ui = { err_invalid: 'bad', err_required: 'req', e_generic: 'oops', e_rate_limited: 'slow' };
  assert.equal(fieldMessage('required', ui), 'req');
  assert.equal(fieldMessage('too_long', ui), 'bad');
  assert.equal(failureMessage('onboarding.rate_limited', ui), 'slow');
  assert.equal(failureMessage('onboarding.something_new', ui), 'oops');
});

test('validators', () => {
  assert.ok(emailOk('a@b.co'));
  assert.ok(!emailOk('a@b'));
  assert.ok(phoneOk('+420 777 123 456'));
  assert.ok(!phoneOk('12345'));
  assert.ok(!phoneOk('call me'));
  assert.equal(fill('Step {n} of {total}', { n: 2, total: 5 }), 'Step 2 of 5');
});

test('utm: only utm_* and a foreign referrer host', () => {
  assert.deepEqual(collectUtm('?utm_source=fb&x=1&utm_campaign=c', 'https://www.google.com/search?q=secret'), { utm_source: 'fb', utm_campaign: 'c', referrer: 'www.google.com' });
  assert.deepEqual(collectUtm('', 'https://arenasoldout.com/pricing'), {});
});

test('stepOfField and countries', () => {
  const steps = [{ key: 'a', title: 'A', fields: [f('text', { key: 'x' })] }, { key: 'b', title: 'B', fields: [f('text', { key: 'y' })] }];
  assert.equal(stepOfField(steps, ['y']), 1);
  assert.equal(stepOfField(steps, ['zz']), -1);
  const all = countryOptions([], 'en');
  assert.ok(all.length > 150 && all.some((c) => c.value === 'CZ'));
  assert.deepEqual(countryOptions(['cz', 'es'], 'en').map((c) => c.value).sort(), ['CZ', 'ES']);
});
