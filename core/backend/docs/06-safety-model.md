# Safety Model

Every safety property in CodeGen Core, what it defends against, where it is enforced,
and the test that proves it still works.

The organising principle: **a control that configuration can switch off is not a
control, it is a default.** Safety properties therefore live in Python, are
asserted at boot, and are covered by tests that fail loudly if someone adds an
escape hatch.

---

## The eleven properties

| # | Property | Enforced in | Proven by |
|---|---|---|---|
| 1 | Two human gates cannot be disabled | `core/config.py::assert_invariants` | `test_config_invariants.py` (8 tests) |
| 2 | Approvals bind to exact bytes | `steps/06`, `steps/24` | `test_approval_is_bound_to_the_artifact_sha` |
| 3 | Implementation cannot start before approval | `core/policy.py::assert_preconditions` | `test_policy_gates.py` |
| 4 | Writes are confined to a whitelist | `tools/file_write_guard.py` | `test_write_guard.py` (7 tests) |
| 5 | The reviewer is never the author | `llm/router.py` + `steps/23` | `test_router_isolation.py` |
| 6 | Remediation cannot loop forever | `orchestrator/remediation.py` | `test_loop_budget_is_exhausted...` |
| 7 | Requirements are never invented | prompts 03/12/13 + `steps/03` | verdict logic in `steps/13` |
| 8 | Secrets never enter artifacts | `core/config.py`, `core/prompts.py` | `test_literal_secret_in_config_is_rejected` |
| 9 | A rejection is answered with a document, not a retry | `orchestrator/gate_revision.py` | `test_gate_revision.py` (27 tests) |
| 10 | A failed step blocks everything behind it | `orchestrator/runner.py` | `test_a_failed_step_blocks_the_run` |
| 11 | Reuse never answers for a human | `core/ledger.py` | `test_the_two_gates_are_never_answered_from_the_ledger` |

---

## 1 — The gates are unreachable from config

**Defends against:** the 3 a.m. incident where someone flips a flag to ship
faster and no part of the system objects.

`MANDATORY_GATES = ("06", "24")` is a Python constant. `assert_invariants()`
refuses to construct an `AppConfig` where either step is missing, disabled, or
has `component != "gate"`, and refuses any `gates.NN.can_disable: true`.

The check runs **after** the profile overlay is merged, which closes the subtle
hole: a base config that looks correct plus a profile that guts it.

```python
for g in MANDATORY_GATES:
    cfg = self.steps.get(g)
    if cfg is None or not cfg.enabled or cfg.component != "gate":
        raise ConfigError(...)
```

There is a second, independent check: `steps/_loader.py` refuses to return a
registry missing 06 or 24, even if the config somehow validated. Two mechanisms,
different layers, same property.

```python
# tests prove all four attack paths
test_gate_cannot_be_disabled
test_gate_cannot_be_downgraded_to_a_non_gate
test_gate_cannot_be_disabled_via_a_profile_overlay
test_gate_can_disable_flag_is_rejected
```

---

## 2 — Approvals bind to bytes, not to intent

**Defends against:** approving BRD v1 and shipping BRD v3.

Every gate records `artifact_sha256` of the document it approved. Because the
artifact store is immutable and versioned, regenerating a BRD produces a new
file with a new hash — and the old approval no longer refers to anything being
shipped.

```json
{ "gate": "BRD", "status": "APPROVED",
  "approver_id": "priya@…", "approver_role": "product_owner",
  "artifact_sha256": "bfdb1432adf492ac…" }
```

This is what makes "approved" mean *a specific human approved these exact
bytes*, which is the only version of approval that survives an audit.

The same property is what makes a replacement document safe. When a reviewer
answers a rejected gate with a BRD of their own, the new file gets its own hash,
supersedes the old one in the artifact index, and the gate re-opens bound to the
new checksum. An approval can never be recorded against bytes the run has
already replaced, and the replaced bytes stay on disk so an auditor can read
what was rejected as well as what was accepted.

---

## 3 — Preconditions, checked twice

**Defends against:** a reordered pipeline, a `--start 12` invocation, or a
future refactor quietly skipping the gate.

`PolicyEngine.assert_preconditions()` runs before every step:

- Steps 7–24 require an `APPROVED` entry for step 06 in the journal.
- Steps 12+ additionally require an Impact Manifest — no whitelist, no writes.

The runner also checks gate status. The duplication is deliberate: defence in
depth on the only two human controls in the system.

Note it reads the **journal**, not memory. A resumed job re-derives approval
state from disk, so a restart cannot launder an unapproved run into an approved
one.

---

## 4 — Bounded blast radius

**Defends against:** an agent "helpfully" refactoring code the ticket never
mentioned, or writing outside the repo entirely.

`GuardedFS` enforces five things in order, before any byte reaches disk:

1. Path resolves inside the workspace (blocks `../` traversal)
2. Path matches no `deny_glob`
3. Path matches at least one whitelist glob from step 09
4. Cumulative file count and changed LOC stay within budget
5. Migrations are blocked without explicit human signoff

Deny is checked **before** allow. A whitelist of `["**"]` still cannot write
`.env.production`.

### The `**/` glob bug

Real defect, caught by a test rather than by review. `fnmatch` does not treat
`**/` as "any depth including none", so `**/.env*` failed to match a top-level
`.env.production` — deny globs silently missed every file at the repo root.

`PolicyEngine._glob_match` compensates by also testing the pattern with `**/`
stripped, and at each path-segment boundary. If you add glob handling elsewhere,
replicate this or the hole reopens.

### The honest weakness

A `cli_agent` backend with `edits_files_directly: true` (Cursor, Claude Code)
writes to disk itself and **never calls the guard**. Step 12 falls back to
`audit_changeset()`, which applies the same rules to the resulting diff.

That is strictly weaker. The unwanted edit already exists on disk; it is merely
uncommitted. It is documented here, in `CLAUDE.md`, and in the step 12 docstring
rather than buried, because choosing a dev-tool backend is choosing that trade.
If the whitelist genuinely matters for your use case, route step 12 to an
in-process backend.

---

## 5 — The reviewer is never the author

**Defends against:** a model approving its own work, which it will reliably do.

Enforced in three layers:

1. **Config validation** rejects an isolation rule that cannot be satisfied —
   fewer than two distinct enabled backends means the reviewer *would be* the
   author, so the system refuses to boot.
2. **The router** reads the journal for which model actually executed step 12,
   and walks the fallback chain if step 23 would resolve to the same one.
3. **Step 23 itself** forces `CHANGES_REQUESTED` if the reviewer model somehow
   equals the author model — a loud failure beats a silent self-approval.

Note that layer 2 keys off `provenance.model_id` from the journal, not off
config. If a fallback fired at step 12 and it actually ran on a different model
than configured, isolation still holds against the model that *ran*.

---

## 6 — Remediation cannot spin forever

**Defends against:** an agent and a verifier disagreeing indefinitely, burning
budget until someone notices.

Every edge in `config.pipeline.remediation_edges` carries `max_loops`, and
config validation rejects `max_loops < 1`. The journal counts loops per edge;
exceeding the budget escalates to the notifier and halts.

Budgets are tuned to how expensive the failure is to diagnose: security findings
get 2 (a human should look), unit tests get 4 (usually mechanical), human
rejection at 24 gets 5 (the most valuable signal in the system).

There is a second brake: `routing.budgets.per_job_usd`, asserted before and
after every step.

---

## 9 — A rejected gate stops, and is answered with a document

**Defends against:** the two ways a rejection quietly stops meaning anything —
re-running the generator until it produces something the reviewer gives up on,
and resuming past a gate that holds a record but was never approved.

There is no `REJECTED` edge from step 06, and config validation rejects one
where the gate accepts a replacement: the model read the same story, the same
analysis and the same project context, so step 05 would write the same document.
The run halts. What moves it on is a different document, supplied by the person
who rejected the first one:

```
06 AWAITING_APPROVAL --reject--> 06 REJECTED, run halts, nothing past 06 runs
06 REJECTED --revise--> step 05 artifacts superseded, rejection archived,
                        gate re-opened against the new checksum
06 AWAITING_APPROVAL --approve--> run resumes at 07 with the human's BRD
```

Four properties hold this together:

1. **The document must parse into `BrdV1`.** A BRD without acceptance criteria
   is refused, because steps 07, 13 and 23 all trace to their ids — an unparsed
   document would stop constraining anything downstream while looking fine.
2. **Only a role the gate accepts may replace it.** Choosing what the gate is
   asked about is as consequential as answering it.
3. **A decision is refused while a document is owed**, so an approval cannot
   land against the bytes that were just rejected.
4. **Resume returns to the gate, not past it.** `PipelineRunner.resume_point()`
   finds the first *unfinished* step; "last record plus one" would have walked
   into step 07 on a rejected BRD.

Replacements are bounded by `gates.06.revision.max_revisions`, for the same
reason remediation edges are bounded: a loop a human drives is still a loop.

---

## 10 — A failed step blocks everything behind it

**Defends against:** a pipeline that keeps going past the point where it stopped
being right, and produces twenty steps of work built on a failure.

A declared remediation edge may loop while its budget lasts — a flaky test run
is worth retrying automatically. When the budget is spent, or the failure has no
edge at all, the run stops. Nothing downstream executes, `run_halted` names the
step, and the dashboard offers exactly one control: **Retry**.

Retry re-runs *strictly that step* from the beginning. Not the steps before it,
which are finished and whose documents are correct; not a fresh run, which would
pay for all of them again. If it clears, the run continues from there. If it
fails again, the run is blocked again — there is no attempt limit on a human
deciding to try once more, and no way for trying to advance the pipeline past
the thing that is wrong.

Retry also ignores the story ledger (property 11). A cached artifact is exactly
what a failed step does not have, and a person pressing Retry is asking for the
work to happen rather than for a lookup.

---

## 11 — Reuse never answers for a human

**Defends against:** the obvious optimisation eating the control it was supposed
to run past.

Running the same story twice should not pay twice, so `core/ledger.py` files
every step's output against `JIRA number + step + sha256(its inputs)` and skips
a step whose inputs are byte-identical to last time. That is where the token
saving lives, and the input hash is what keeps it honest: replace the BRD at
gate 06 and steps 07 onward have different inputs, different keys, and no cache
to hit.

Three things are never served from it:

- **Gates 06 and 24.** A stored approval replayed into a new run is a decision
  nobody took on a document nobody saw. They always execute and always wait.
- **Step 01.** It costs no tokens, and it is where a changed ticket enters the
  pipeline. Caching it would hide an edited story from every step that follows.
- **Anything retried.** See property 10.

A corrupt or missing ledger costs tokens, never correctness: the run regenerates
what it cannot reuse.

---

## 7 — Non-invention

**Defends against:** the most expensive failure mode in requirements work —
plausible detail invented to fill a gap, discovered after release.

Not a single mechanism but a stance implemented across four places:

- **Step 03** exists solely to surface unknowns, and its prompt forbids
  answering any question it raises.
- **`post_process`** overrides the model: any question with `blocks_step` sets
  `blocking=true` regardless of what the model claimed.
- **Step 12's prompt** forbids implementing anything the acceptance criteria do
  not require, and instructs the agent to stop rather than implement something
  adjacent when the spec is impossible.
- **Step 13** reports `hallucinated_functionality` explicitly and forces
  `verdict=FAILED` when it is non-empty.

Grounding reinforces this: steps 04, 08, and 13 receive deterministic facts
(file index, import graph, traceability matrix) *before* the model reasons, so
it describes what exists rather than what is plausible.

---

## 8 — Secrets stay out

**Defends against:** a pasted API key reaching git, or a credential landing in
an artifact that gets attached to a PR.

- Config stores env var **names**; `${env:VAR}` resolves at load.
- A boot-time scanner rejects anything matching `sk-…`, `ghp_…`, `AKIA…`, or a
  literal bearer token in the *resolved* config.
- `PromptLibrary.redact()` strips `secrets.redaction.patterns` before prompts
  are persisted.
- `secrets.redaction.never_persist_in` marks artifacts and runs as off-limits.
- Gitleaks findings at step 18 are hardcoded `CRITICAL`.

---

## What is deliberately *not* protected

Being explicit about the boundaries is part of the safety model.

- **Merge is a stub.** `GitHubPlugin.merge()` returns "requires an explicit
  human action in this build" outside dry-run. Wiring autonomous merge is a
  decision your team should make consciously.
- **Migrations always halt.** `migrations_require_human_signoff` is on by
  default and blocks any path containing "migration". Schema changes are not a
  thing to automate first.
- **The dashboard has no authentication.** `dashboard/api.py` is a minimal gate
  surface, not a production service. Put it behind your own auth before exposing
  it.
- **Plugin subprocesses are not sandboxed.** Semgrep, Trivy and pytest run with
  the orchestrator's privileges. Run the pipeline in a container.

---

## Verifying the model holds

```bash
codegen-core config validate      # invariants 1, 5, 6, 8
pytest -q                    # all eight, 58 tests
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
```

The third command is the real check — it exercises all 24 steps, both gates, the
artifact rules, the router and the policy engine in about two seconds. Run it
before every commit.

For an adversarial review of the guard specifically, use the
`/audit-guard` slash command in Claude Code.
