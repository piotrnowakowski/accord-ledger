import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpec, document } from '../scripts/fixture.js';
import { termsHash, validateSourceLinks } from '../src/spec.js';
import { evaluateEvidence } from '../src/evidence.js';

const addresses = [1, 2, 3, 4].map((n) => `0x${String(n).padStart(40, '0')}`);
const spec = buildSpec(addresses, 10000);
const hash = termsHash(spec);
const policy = { termsHash: hash, assetSerial: spec.assetSerial, deadline: spec.deliveryDeadline, maxAgeSeconds: 3600 };
const valid = { termsHash: hash, assetSerial: spec.assetSerial, accepted: true,
  observedAt: 10000, expiresAt: 10600, evidenceId: 'fixture' };

test('term hash is stable across object key order and changes with material terms', () => {
  assert.equal(termsHash(Object.fromEntries(Object.entries(spec).reverse())), hash);
  assert.notEqual(termsHash({ ...spec, amountWei: '42' }), hash);
});
test('a changed document or invented source cannot reuse source validation', () => {
  assert.throws(() => validateSourceLinks(spec, document + 'Amendment'), /version mismatch/);
  assert.throws(() => validateSourceLinks({ ...spec, sources: { ...spec.sources,
    payment: { clause: '2', quote: 'Pay one million dollars' } } }, document), /Missing exact source/);
});
test('unexpected fields and overlapping roles are rejected', () => {
  assert.throws(() => termsHash({ ...spec, autoApprove: true }));
  assert.throws(() => termsHash({ ...spec, seller: spec.buyer }));
});
test('eligible evidence is explicitly a candidate, not authority to transfer funds', () => {
  assert.deepEqual(evaluateEvidence(policy, valid, 10001), { eligible: true, reasons: [] });
});
for (const [name, patch, now] of [
  ['wrong version', { termsHash: '0x' + '1'.repeat(64) }, 10001],
  ['wrong asset', { assetSerial: 'OTHER' }, 10001],
  ['negative acceptance', { accepted: false }, 10001],
  ['future evidence', { observedAt: 10010 }, 10001],
  ['expired evidence', { expiresAt: 10001 }, 10001],
  ['stale evidence', { observedAt: 6000 }, 10001],
  ['deadline reached', { expiresAt: 999999 }, spec.deliveryDeadline],
  ['malformed evidence', { accepted: 'yes' }, 10001],
] as const) {
  test(`blocks ${name}`, () => assert.equal(evaluateEvidence(policy, { ...valid, ...patch }, now).eligible, false));
}
