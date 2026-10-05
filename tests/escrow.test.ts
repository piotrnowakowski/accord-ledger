import { test } from 'node:test';
import assert from 'node:assert/strict';
import { id } from 'ethers';
import { localFixture, approveAndFund } from '../scripts/fixture.js';

test('requires exact approvals and exact funding; releases only once to seller', async () => {
  const f = await localFixture();
  try {
    const [buyer, seller, inspector, , outsider] = f.contracts;
    await assert.rejects(buyer.fund({ value: f.spec.amountWei }));
    await assert.rejects(outsider.approve(f.terms));
    await assert.rejects(buyer.approve(id('wrong')));
    await (await buyer.approve(f.terms)).wait();
    await assert.rejects(buyer.fund({ value: f.spec.amountWei }));
    await (await seller.approve(f.terms)).wait();
    await assert.rejects(buyer.fund({ value: 1 }));
    await (await buyer.fund({ value: f.spec.amountWei })).wait();
    const now = (await f.provider.getBlock('latest'))!.timestamp;
    const args = [f.terms, id(f.spec.assetSerial), id('evidence'), now, now + 600];
    await assert.rejects(outsider.attestAcceptance(...args));
    await assert.rejects(inspector.attestAcceptance(id('wrong'), ...args.slice(1)));
    await assert.rejects(inspector.attestAcceptance(f.terms, id('wrong asset'), ...args.slice(2)));
    await assert.rejects(inspector.attestAcceptance(...args.slice(0, 3), now - 7200, now + 600));
    await assert.rejects(inspector.attestAcceptance(...args.slice(0, 3), now, now));
    await (await inspector.attestAcceptance(...args)).wait();
    assert.equal(await buyer.state(), 4n);
    assert.equal(await buyer.withdrawable(f.spec.seller), BigInt(f.spec.amountWei));
    await assert.rejects(inspector.attestAcceptance(...args));
    await assert.rejects(buyer.refundExpired());
    await (await seller.withdraw()).wait();
    await assert.rejects(seller.withdraw());
    assert.equal(await f.provider.getBalance(f.address), 0n);
  } finally { await f.close(); }
});

test('dispute blocks both automatic release and timeout refund; arbitrator decides', async () => {
  const f = await localFixture();
  try {
    await approveAndFund(f);
    const [buyer, , inspector, arbitrator, outsider] = f.contracts;
    await assert.rejects(outsider.dispute());
    await (await buyer.dispute()).wait();
    const now = (await f.provider.getBlock('latest'))!.timestamp;
    await assert.rejects(inspector.attestAcceptance(f.terms, id(f.spec.assetSerial), id('evidence'), now, now + 600));
    await f.provider.send('evm_increaseTime', [86401]);
    await f.provider.send('evm_mine', []);
    await assert.rejects(buyer.refundExpired());
    await assert.rejects(outsider.resolve(true, id('decision')));
    await (await arbitrator.resolve(false, id('decision'))).wait();
    assert.equal(await buyer.state(), 5n);
    await (await buyer.withdraw()).wait();
    assert.equal(await f.provider.getBalance(f.address), 0n);
  } finally { await f.close(); }
});

test('buyer can refund after deadline when there is no dispute', async () => {
  const f = await localFixture();
  try {
    await approveAndFund(f);
    await assert.rejects(f.contracts[0].refundExpired());
    await f.provider.send('evm_increaseTime', [86401]);
    await f.provider.send('evm_mine', []);
    await (await f.contracts[0].refundExpired()).wait();
    assert.equal(await f.contracts[0].state(), 5n);
    assert.equal(await f.contracts[0].withdrawable(f.spec.buyer), BigInt(f.spec.amountWei));
  } finally { await f.close(); }
});
