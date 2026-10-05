# Accord Ledger

Turn reviewed agreement terms into explicit escrow conditions, with evidence tied to the exact document version.

Independent prototype for **BLI Legal Tech Hackathon 2**, targeting LegalTech/RegTech and the Chainlink CRE bounty. Built from scratch; no RealtimeApp, Diktum Suite or Word add-in dependency.

**Status:** working local EVM prototype; CRE workflow compiles to WASM. The required CRE simulation is **pending authentication**, so this is not yet a completed bounty submission. See [requirements and evidence](docs/HACKATHON.md).

## What works

- A strict, manually populated agreement specification with document hash and exact clause quotations.
- Both parties approve the same immutable terms hash before funding.
- Solidity escrow: inspector acceptance, deadline refund, dispute freeze, arbitrator resolution and pull withdrawals.
- Evidence checks reject a different agreement version, wrong asset, negative acceptance, malformed, future, stale or expired evidence.
- A real CRE workflow reads the escrow's on-chain policy and an external HTTP evidence service, then emits a read-only eligibility candidate.
- Synthetic local fixtures, 15 automated tests and GitHub Actions checks.

**Not implemented:** AI document extraction, PDF/DOCX ingestion, review UI, signed HTTP evidence, CRE report receiver or production deployment. CRE does not release money in this version. The local escrow demo uses a separate inspector transaction. No automatic legal-validity or ownership-transfer claim is made.

## Run locally

Use Node.js 22.13+ (tested on 24.19), npm and Git.

```sh
npm ci
npm run check
```

`check` type-checks both runtimes, runs tests, compiles Solidity and executes the local payment demo. It requires no wallet, account, private key or public-chain funds. The demo uses synthetic ETH on a disposable Hardhat network and shuts it down afterward.

```sh
npm run demo
npm test
```

Demo flow: review fixture → approve matching hashes → fund → reject wrong-asset evidence → inspector acceptance → seller withdrawal. Tests also exercise disputed and expired agreements.

## Chainlink CRE

Install [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation/windows) and Bun (SDK requires 1.2.21+), both on PATH. Validated compiler versions: CRE CLI 1.36.0, SDK 1.23.0. CLI account setup is external to this repository.

```sh
npm run cre:build
cre login
```

Start fixtures in terminal one:

```sh
npm run cre:fixture
```

Run the workflow in terminal two:

```sh
npm run cre:simulate
```

The fixture writes an ignored `cre/evidence-check/config.local.json` and serves ephemeral JSON-RPC on `127.0.0.1:8545` and unsigned synthetic evidence on `127.0.0.1:8787/evidence`. Its local chain uses Sepolia's chain ID only for CRE routing; **it is not public Sepolia**. Restart the fixture to refresh expiring evidence. Ctrl+C stops the servers.

The simulation command intentionally has no `--broadcast`. Its expected output is `mode: read-only-candidate`, `eligible: true`, `issuerAuthenticated: false`, `releaseAuthorized: false`. This expected result is **not yet an observed CRE execution result**. CLI authentication failed before simulation in the initial environment; network capability behavior still needs verification after login.

## Structure

| Path | Purpose |
| --- | --- |
| `src/spec.ts` | Strict terms, canonical serialization, document and terms commitments |
| `src/evidence.ts` | Shared fail-closed evidence eligibility checks |
| `contracts/AccordEscrow.sol` | Fixed escrow policy; no generated arbitrary Solidity |
| `cre/evidence-check/main.ts` | CRE cron → EVM read → HTTP consensus → candidate |
| `fixtures/` | Synthetic agreement, no client data |
| `tests/` | Policy tests and actual local EVM transaction tests |
| `docs/` | Hackathon requirements, architecture, provenance and submission draft |

[Architecture and limits](docs/ARCHITECTURE.md) · [Next work](docs/ROADMAP.md) · [Submission draft](docs/SUBMISSION.md)

## Po polsku

To osobne repo dla pomysłu „umowa → zatwierdzone warunki → smart kontrakt”. Jest już działający mechanizm escrow i workflow CRE. Następny etap to ekstrakcja warunków z dokumentu i ekran ich zatwierdzania. Weryfikacja cytatu potwierdza jego pochodzenie, nie poprawność interpretacji prawnej. Stan rzeczywisty musi potwierdzić wskazany inspektor lub inne wiarygodne źródło.

Original project code: MIT. Third-party dependencies retain their own licenses; the CRE SDK uses BUSL-1.1. See [provenance](docs/PROVENANCE.md).
