# Provenance and validation

Initialized 2026-10-05 as a standalone repository. No files or dependencies were copied from Diktum Suite, RealtimeApp or the Word add-in. The equipment agreement is a newly authored synthetic fixture. Coding and documentation used AI assistance.

Original source is MIT licensed. Public package APIs and Chainlink examples informed integration; dependencies remain under their respective upstream licenses. In particular, `@chainlink/cre-sdk` 1.23.0 declares BUSL-1.1; this repository's MIT license does not relicense it. Inspect dependency licenses before redistributing bundles.

References:

- [CRE SDK](https://github.com/smartcontractkit/cre-sdk-typescript)
- [CRE templates](https://github.com/smartcontractkit/cre-templates)
- [CRE CLI releases](https://github.com/smartcontractkit/cre-cli/releases)
- [Hardhat](https://github.com/NomicFoundation/hardhat)
- [Solidity](https://github.com/ethereum/solidity)

Initial local verification on Windows, Node 24.19.0:

- TypeScript checks for host tools and isolated CRE runtime passed.
- 15 tests passed, including real transactions on a disposable local EVM.
- Solidity 0.8.37 compiled successfully; local end-to-end demo reached seller withdrawal.
- CRE SDK workflow compiled to WASM using Bun and the official SDK compiler.
- CRE CLI 1.36.0 simulation was attempted but stopped before execution because authentication was absent. No successful CRE simulation, report delivery or live deployment has been observed.

`npm run check` does not invoke the authenticated CRE simulator. GitHub Actions repeats the host checks; its status is independent of local evidence. `tmp` is overridden to 0.2.7 to address the compiler dependency's older version; the lockfile captures the dependency graph.
