import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { BrowserProvider } from 'ethers';
import { network } from 'hardhat';
import { approveAndFund, deployFixture } from './fixture.js';

// RPC is loopback-only, ephemeral and funded exclusively with synthetic balances.
const rpc = await network.createServer({ network: 'default', override: { chainId: 11155111 } }, '127.0.0.1', 8545);
await rpc.listen();
const provider = new BrowserProvider({ request: async ({ method, params }) => {
  const response = await fetch('http://127.0.0.1:8545', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] }) });
  const body = await response.json() as { result?: unknown; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result;
} }, undefined, { cacheTimeout: -1 });
const fixture = await deployFixture(provider);
await approveAndFund(fixture);
const now = Math.floor(Date.now() / 1000);
const evidence = { termsHash: fixture.terms, assetSerial: fixture.spec.assetSerial,
  accepted: true, observedAt: now, expiresAt: now + 3600, evidenceId: 'synthetic-inspection-001' };
const api = createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== '/evidence') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(evidence));
});
await new Promise<void>((resolve, reject) => {
  api.once('error', reject);
  api.listen(8787, '127.0.0.1', resolve);
});
writeFileSync(new URL('../cre/evidence-check/config.local.json', import.meta.url), JSON.stringify({
  schedule: '0 */5 * * * *', escrowAddress: fixture.address, expectedTermsHash: fixture.terms,
  assetSerial: fixture.spec.assetSerial, evidenceUrl: 'http://127.0.0.1:8787/evidence',
}, null, 2) + '\n');
console.log('SYNTHETIC LOCAL EVM + unsigned evidence API ready. No public-chain connection.');
console.log('Run npm run cre:simulate in a second terminal with CRE CLI authenticated. Ctrl+C stops fixtures.');
async function close() { api.close(); provider.destroy(); await rpc.close(); process.exit(0); }
process.once('SIGINT', close);
process.once('SIGTERM', close);
