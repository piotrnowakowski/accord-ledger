import {
  cre, Runner, getNetwork, encodeCallMsg, bytesToHex, LATEST_BLOCK_NUMBER,
  consensusIdenticalAggregation, text, type Runtime, type HTTPSendRequester,
} from '@chainlink/cre-sdk';
import { z } from 'zod';
import { encodeFunctionData, decodeFunctionResult, parseAbi, keccak256, toBytes, zeroAddress } from 'viem';
import { evaluateEvidence } from '../../src/evidence.js';

const configSchema = z.object({
  schedule: z.string(),
  escrowAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  expectedTermsHash: z.string().regex(/^0x[0-9a-f]{64}$/),
  assetSerial: z.string().min(1),
  evidenceUrl: z.string().url(),
}).strict();
type Config = z.infer<typeof configSchema>;
const abi = parseAbi([
  'function inspectionPolicy() view returns (bytes32 terms, bytes32 asset, uint8 state, uint256 deadline, uint256 maxAge)',
]);

function fetchEvidence(requester: HTTPSendRequester, config: Config): string {
  const response = requester.sendRequest({ method: 'GET', url: config.evidenceUrl }).result();
  if (response.statusCode !== 200) throw new Error('Evidence service unavailable');
  return text(response);
}

function inspect(runtime: Runtime<Config>): string {
  const config = runtime.config;
  const chain = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true });
  if (!chain) throw new Error('Unsupported chain');
  const evm = new cre.capabilities.EVMClient(chain.chainSelector.selector);
  const result = evm.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: config.escrowAddress as `0x${string}`,
      data: encodeFunctionData({ abi, functionName: 'inspectionPolicy' }) }),
    // Local fixture only. A deployed version needs an explicit finality policy.
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  const [terms, asset, state, deadline, maxAge] = decodeFunctionResult({
    abi, functionName: 'inspectionPolicy', data: bytesToHex(result.data),
  });
  if (terms !== config.expectedTermsHash || asset !== keccak256(toBytes(config.assetSerial))) {
    throw new Error('On-chain agreement does not match configured review');
  }
  if (deadline > BigInt(Number.MAX_SAFE_INTEGER) || maxAge > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Policy time out of range');
  }
  const raw = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, fetchEvidence, consensusIdenticalAggregation<string>())(config).result();
  const decision = evaluateEvidence({ termsHash: terms, assetSerial: config.assetSerial,
    deadline: Number(deadline), maxAgeSeconds: Number(maxAge) }, JSON.parse(raw),
  Math.floor(runtime.now().getTime() / 1000));
  if (state !== 2) { decision.eligible = false; decision.reasons.push('Escrow not funded or is disputed'); }
  const output = JSON.stringify({ mode: 'read-only-candidate', escrow: config.escrowAddress,
    termsHash: terms, ...decision, issuerAuthenticated: false, releaseAuthorized: false });
  runtime.log(output);
  return output;
}

export async function main() {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run((config) => [cre.handler(
    new cre.capabilities.CronCapability().trigger({ schedule: config.schedule }), inspect,
  )]);
}
