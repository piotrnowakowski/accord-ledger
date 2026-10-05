import { readFileSync } from 'node:fs';
import solc from 'solc';

export function compileEscrow() {
  const source = readFileSync(new URL('../contracts/AccordEscrow.sol', import.meta.url), 'utf8');
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources: { 'AccordEscrow.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  })));
  const errors = (output.errors ?? []).filter((e: { severity: string }) => e.severity === 'error');
  if (errors.length) throw new Error(errors.map((e: { formattedMessage: string }) => e.formattedMessage).join('\n'));
  const result = output.contracts['AccordEscrow.sol'].AccordEscrow;
  return { abi: result.abi, bytecode: `0x${result.evm.bytecode.object}`, compiler: solc.version() };
}
