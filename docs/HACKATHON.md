# Hackathon requirements and verification

Checked against organizer pages on **2026-10-05**. Eligibility and prize awards remain the organizer's decision.

## Sources

- [BLI Legal Tech Hackathon 2](https://dorahacks.io/hackathon/legal-hack-2026/build)
- [Published tracks](https://dorahacks.io/hackathon/legal-hack-2026/buidl)
- [Chainlink CRE bounty 1362](https://dorahacks.io/hackathon/bounty/1362)
- [Organizer Q&A](https://dorahacks.io/hackathon/legal-hack-2026/qa)
- [Official CRE CLI documentation](https://docs.chain.link/cre/getting-started/cli-installation/windows)

The page displayed the submission deadline as **2026-11-01 02:01 Europe/Warsaw** (2026-11-01 01:01 UTC). Recheck the live page before submitting. The event advertises a $20,000 prize pool; this is not a guaranteed payment. The Chainlink bounty lists two $1,000 awards.

## Fit

Primary target: **LegalTech / RegTech**. The product connects a reviewed legal document to transparent execution conditions. A real blockchain component is present: approval commitments, escrow state and conditional settlement.

Potential additional fit: **AI × Blockchain**, after actual extraction/review assistance is implemented. Do not describe the current manual specification fixture as functioning AI. RWA is an optional future direction; this prototype does not establish legally effective title transfer.

## Chainlink bounty checklist

| Published requirement | Current evidence |
| --- | --- |
| CRE workflow orchestrates part of the project | Source implemented; type-check and WASM compilation passed |
| Integrate at least one blockchain with an external API/system/data/LLM/agent | Workflow reads EVM policy and HTTP evidence; synthetic fixture endpoints verified independently |
| Successful CRE CLI simulation OR live deployment demonstrated | **Pending**: CLI v1.36.0 stopped with `Authentication required: not logged in and no CRE_API_KEY set` |

Neither local EVM tests nor WASM compilation replace the required CRE execution proof. No live deployment, simulation success or prize eligibility is claimed. The read-only workflow is an intentional integration; the Solidity inspector payment flow is tested separately.

## Submission work still needed

- Authenticate CRE, run simulation and preserve sanitized output and a reproducible recording.
- Confirm current submission fields, deadline and any organizer updates.
- Register/submit the BUIDL and attach repository access, demo and workflow evidence as requested.
- Confirm whether a public repository, open-source license, demo format, team constraints or other requirements apply. The organizer Q&A contained unanswered questions about these details at the time of checking; they are not invented here as confirmed rules.
- The repository starts private by default. This is a development preference, not a confirmed competition allowance. Provide access or change visibility when the submission requirements are known.

Originality: all application code in this repository starts here; no RealtimeApp or Word add-in code has been imported. Standard public dependencies are declared and locked. AI coding assistance is disclosed in provenance.
