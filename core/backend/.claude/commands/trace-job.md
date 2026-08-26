---
description: Explain what happened in a job run from its journal and artifacts
argument-hint: <JOB-ID>
---

Investigate job `$1` and explain what happened.

Read, in this order:
1. `runs/$1/journal.ndjson` — the append-only record. Every step, approval,
   remediation loop and event is here.
2. `artifacts/$1/index.json` — what was produced, with checksums.
3. The specific artifacts relevant to whatever went wrong.

Report:
- Which step it halted at, and the remediation edge that led there
- Which model ran each step (`provenance.model_id`), and whether reviewer
  isolation held between 12/15 and 13/23
- Total cost, and whether any budget was hit
- Both gate decisions: who approved, when, and against which artifact SHA
- If a loop budget was exhausted, which edge and how many times it cycled

Do not re-run anything. This is a read-only investigation.
