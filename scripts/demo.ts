import assert from 'node:assert/strict';
import { id } from 'ethers';
import { localFixture, approveAndFund } from './fixture.js';
import { evaluateEvidence } from '../src/evidence.js';

const f = await localFixture();
try {
  await approveAndFund(f);
  const now = (await f.provider.getBlock('latest'))!.timestamp;
  const evidence = { termsHash: f.terms, assetSerial: f.spec.assetSerial, accepted: true,
    observedAt: now, expiresAt: now + 600, evidenceId: 'synthetic-inspection-001' };
  const policy = { termsHash: f.terms, assetSerial: f.spec.assetSerial,
    deadline: f.spec.deliveryDeadline, maxAgeSeconds: f.spec.evidenceMaxAgeSeconds };
  assert.equal(evaluateEvidence(policy, { ...evidence, assetSerial: 'OTHER' }, now).eligible, false);
  assert.equal(evaluateEvidence(policy, evidence, now).eligible, true);
  await (await f.contracts[2].attestAcceptance(f.terms, id(f.spec.assetSerial), id(JSON.stringify(evidence)),
    now, now + 600)).wait();
  assert.equal(await f.contracts[0].state(), 4n);
  await (await f.contracts[1].withdraw()).wait();
  assert.equal(await f.provider.getBalance(f.address), 0n);
  console.log(JSON.stringify({
    mode: 'LOCAL EVM ONLY - synthetic agreement and funds; no CRE runtime used',
    documentSource: 'fixtures/equipment-sale.txt', termsHash: f.terms,
    checks: ['source quotes found', 'both parties approved', 'escrow funded',
      'wrong asset rejected by evidence evaluator', 'inspector attestation accepted', 'seller withdrew'],
    state: 'Released', contractAddress: f.address,
  }, null, 2));
} finally { await f.close(); }
