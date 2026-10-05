import { readFileSync } from 'node:fs';
import { parseEther, id, BrowserProvider, Contract, ContractFactory } from 'ethers';
import { documentHash, termsHash, validateSourceLinks } from '../src/spec.js';
import { compileEscrow } from './compile-lib.js';

export const document = readFileSync(new URL('../fixtures/equipment-sale.txt', import.meta.url), 'utf8');
export function buildSpec(addresses: string[], now: number, chainId = 31337) {
  const clause = (n: number) => ({ clause: String(n), quote: document.split('\n').find((s) => s.startsWith(`${n}. `))! });
  return validateSourceLinks({
    schemaVersion: '1', policy: 'equipment-sale-escrow-v1', agreementId: 'synthetic-equipment-001',
    documentHash: documentHash(document), chainId,
    buyer: addresses[0], seller: addresses[1], inspector: addresses[2], arbitrator: addresses[3],
    amountWei: parseEther('0.01').toString(), assetSerial: 'DEMO-001',
    deliveryDeadline: now + 86400, evidenceMaxAgeSeconds: 3600,
    sources: { payment: clause(2), delivery: clause(3), acceptance: clause(4), dispute: clause(5), refund: clause(6) },
  }, document);
}

export async function deployFixture(provider: BrowserProvider) {
  const signers = await Promise.all([0, 1, 2, 3, 4].map((i) => provider.getSigner(i)));
  const block = await provider.getBlock('latest');
  if (!block) throw new Error('No local block');
  const spec = buildSpec(await Promise.all(signers.map((s) => s.getAddress())), block.timestamp,
    Number((await provider.getNetwork()).chainId));
  const artifact = compileEscrow();
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signers[0]);
  const deployed = await factory.deploy(termsHash(spec), id(spec.assetSerial), spec.buyer, spec.seller,
    spec.inspector, spec.arbitrator, spec.amountWei, spec.deliveryDeadline, spec.evidenceMaxAgeSeconds);
  await deployed.waitForDeployment();
  const address = await deployed.getAddress();
  const contracts = signers.map((s) => new Contract(address, artifact.abi, s));
  return { spec, terms: termsHash(spec), address, signers, contracts, provider };
}

export async function localFixture() {
  const { network } = await import('hardhat');
  const connection = await network.create();
  const provider = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 });
  const result = await deployFixture(provider);
  return { ...result, close: async () => { provider.destroy(); await connection.close(); } };
}

export async function approveAndFund(f: Awaited<ReturnType<typeof deployFixture>>) {
  await (await f.contracts[0].approve(f.terms)).wait();
  await (await f.contracts[1].approve(f.terms)).wait();
  await (await f.contracts[0].fund({ value: f.spec.amountWei })).wait();
}
