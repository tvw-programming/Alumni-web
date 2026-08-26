# Step Reference

All 24 steps. For each: what it is *for*, what it consumes, what it produces,
and how it fails. Component kind is not decoration — it tells you whether the
step is non-deterministic, whether it costs money, and whether it can be retried
safely.

Legend: **A** agent · **T** tool · **P** plugin · **G** gate

---

## Phase 1 — Requirements (01–05)

### 01 · Jira Story Extraction — **P**
*Ingestion / Integration*

Reads the ticket and normalises it into `JiraStoryV1` with a checksum.

Not an agent, deliberately: reading a ticket is an API call with an exact
answer. The only judgement involved is pulling acceptance criteria out of a
free-text description, which is a regex — and when the regex finds nothing we
prefer an empty list that step 03 will flag over a model's plausible guess.

| | |
|---|---|
| Consumes | the Jira id from the CLI |
| Produces | `01_jira_story__JOB__v1.json` |
| Fails when | the ticket doesn't exist, or auth is wrong |
| Failure routes to | nothing — halt. A bad ticket id is not remediable by a model |

The `source_checksum` matters more than it looks: every downstream artifact
traces back to the exact ticket state it was derived from, so an edited ticket
produces a visibly different lineage.

---

### 02 · Story Detailed Analysis — **A** (reasoning)
*Requirement Decomposition*

Splits one ticket into six independent concerns: UI, backend, database,
security, integration, non-functional.

The split is what makes every later step tractable. Impact analysis cares about
the database and API axes; the security scanner cares about the security axis;
the test designer walks all six. A model asked to hold all six at once produces
analysis that is thorough on one and thin on the rest.

| | |
|---|---|
| Consumes | `JiraStoryV1` |
| Produces | `02_story_analysis__JOB__v1.json` |
| Fails when | the model returns malformed JSON (retried), or the ticket is empty |

Empty lists are expected output, not a defect. A UI-only ticket should have an
empty `database` list.

---

### 03 · Gap / Ambiguity Detection — **A** (reasoning)
*Requirement QA / Non-invention*

This step exists so the pipeline can say "I don't know".

Its entire output is a list of things the ticket does **not** specify. The
prompt explicitly forbids answering any question it raises, because a gap
quietly filled here becomes a hallucinated feature at step 12 and an argument at
step 24. The cost asymmetry is stark: asking a human costs an hour; inventing a
requirement costs a release.

| | |
|---|---|
| Consumes | `JiraStoryV1`, `StoryAnalysisV1` |
| Produces | `03_ambiguity_report__JOB__v1.json` |
| Status | `AMBIGUOUS` when `blocking=true` |
| Failure routes to | halt + question ticket (`policy.non_invention.on_ambiguity`) |

`post_process` overrides the model: any question carrying `blocks_step` sets
`blocking=true` regardless of what the model claimed.

---

### 04 · Project / Context Specification — **A** (reasoning) + **T**
*Context Engineering*

Project-level rules: architecture, frameworks, folder structure, conventions,
reusable components. Step 10 writes the spec for *this feature*; step 04 writes
the rules that feature must obey.

The repository index is computed deterministically *first* and handed to the
model. That ordering is the whole trick: a model asked to describe a codebase
from memory invents plausible modules, while a model handed a real file listing
describes what exists.

| | |
|---|---|
| Consumes | `JiraStoryV1`, `StoryAnalysisV1` + `index_repo()` ground truth |
| Produces | `04_project_context__JOB__v1.md` |
| Fails when | the model contradicts the supplied index (caught at review, not here) |

---

### 05 · BRD Generation — **A** (reasoning) + **T** (doc_render)
*Business Documentation*

The document a human signs at gate 06, and the contract everything downstream is
measured against.

Acceptance-criterion ids (`AC-1`, `AC-2`, …) are the spine of the entire
pipeline: step 07 designs tests against them, step 13 verifies code against
them, step 23 reviews against them, step 22 lists them in the PR. They must
never be renumbered.

| | |
|---|---|
| Consumes | `JiraStoryV1`, `StoryAnalysisV1`, `AmbiguityReportV1`, `ProjectContextV1` |
| Produces | `05_brd__JOB__v1.md` + `.pdf` (+ `.json` source) |
| Status | `FAILED` if `acceptance_criteria` is empty |
| Failure routes to | itself, via 06 → 05 rejection edge |

A BRD with no acceptance criteria cannot be verified at step 13, so it is not a
BRD. Failing here is cheaper than discovering it seven steps later.

---

## Phase 2 — The First Gate (06)

### 06 · BRD Approval — **G** 🛑 MANDATORY
*Human-in-the-loop control*

Nothing implementation-related proceeds until a human approves.

Three properties make this a real control rather than a speed bump:

1. **It cannot be disabled.** `assert_invariants()` rejects any config where 06
   is missing, disabled, or not a gate — including via a profile overlay. The
   check lives in Python, where JSON cannot reach it.
2. **The approval binds to bytes.** `artifact_sha256` records exactly which BRD
   was approved. Regenerate the BRD and its own approval no longer matches.
3. **The wait survives a restart.** The decision is a file on disk, so a crashed
   orchestrator resumes waiting rather than losing a signature.

| | |
|---|---|
| Consumes | `BrdV1` |
| Produces | `06_brd_approval__JOB__v1.json` |
| Status | `APPROVED` / `REJECTED` / `TIMEOUT` |
| Failure routes to | nowhere — the run halts until a reviewer replaces the BRD |

Gates are never retried by `RetryPolicy` — retrying a human is meaningless.

#### What a rejection does

Not a loop back to step 05. Step 05 read the same story, the same analysis and
the same project context, so it would write the same document; a config that
declares both a `REJECTED` edge and a replacement path is refused at boot.

The run stops, and the reviewer answers with a BRD of their own —
`POST /api/runs/{job}/steps/6/revision`, the **Rerun** button in the dashboard,
or `codegen-core revise <job> 6 <file>`. The upload is parsed into `BrdV1` (a
document with no acceptance criteria is refused, for the same reason step 05
fails without them), supersedes the step 05 artifacts, and the gate re-opens
bound to the new checksum. Approving it resumes the run at 07 against the
reviewer's document.

Bounded by `gates.06.revision.max_revisions`, because a loop a human drives is
still a loop. Configured under `gates.06.revision` — see `04-configuration.md`.

---

## Phase 3 — Design & Scoping (07–11)

### 07 · Test Case Design — **A** (reasoning)
*Test Design (pre-implementation)*

Tests designed **before** code exists and **after** the BRD is approved.

Both halves of that ordering matter. Designed from approved requirements, tests
describe *intended* behaviour; written after the code, they describe whatever
the code happens to do. Only the first kind can catch a wrong implementation —
the second kind passes forever and proves nothing.

| | |
|---|---|
| Consumes | `BrdV1`, `StoryAnalysisV1` |
| Produces | `07_test_design__JOB__v1.json` |
| Status | `FAILED` if any AC id has no covering test |
| Failure routes to | halt (a gap here is a requirements problem) |

---

### 08 · Repository Understanding — **A** (coding) + **T**
*Code Comprehension*

The "Our Understanding" document. Same ground-truth-first pattern as step 04,
but deeper: file index plus the Python import graph.

Focus is on what a person changing this code actually needs — entry points,
which module owns which concern, what the import edges imply about coupling, and
which existing implementations are close enough to copy patterns from.

| | |
|---|---|
| Consumes | `ProjectContextV1`, `BrdV1` + index & import graph |
| Produces | `08_repo_understanding__JOB__v1.md` |

---

### 09 · Impact Analysis — **A** (coding)
*Change Scoping / Whitelisting*

**The most safety-critical artifact in the pipeline.**

`allowed_paths` becomes the hard write whitelist `GuardedFS` enforces at step 12.
`loc_budget` becomes the change cap. Everything the code agent is permitted to
do is decided here — by a model that has not yet written any code it might want
to protect.

| | |
|---|---|
| Consumes | `BrdV1`, `RepoUnderstandingV1`, `StoryAnalysisV1`, `TestDesignV1` |
| Produces | `09_impact_manifest__JOB__v1.json` |
| Status | `FAILED` if no usable whitelist could be derived |

`post_process` derives `allowed_paths` from the named files when the model omits
it, and clamps `loc_budget` to `policy.write_scope.max_changed_loc`. The
whitelist can never be accidentally unbounded — worst case it is `__nothing__`,
which fails the step.

---

### 10 · Feature Specification — **A** (reasoning)
*Technical Specification*

The technical contract for this ticket only. Where step 04 said "one router per
resource", this says "`POST /api/v1/users/{id}/export` returns 202 with a job
id, 403 when id ≠ subject".

`implementation_boundaries` earns its place: it states in writing what must
*not* be touched, and is handed verbatim to the code agent at step 12.

| | |
|---|---|
| Consumes | `BrdV1`, `ProjectContextV1`, `RepoUnderstandingV1`, `ImpactManifestV1` |
| Produces | `10_feature_spec__JOB__v1.md` |

---

### 11 · Implementation Plan — **A** (coding)
*Ordered Change Planning*

Converts the spec into a sequence: schema → migration → repository → service →
API → UI → tests → docs.

Without it, an agent edits files in whatever order it thought of them, producing
diffs nobody can review and half-finished intermediate states that break the
build. `post_process` enforces the layer ordering deterministically rather than
trusting the model to sort.

| | |
|---|---|
| Consumes | `FeatureSpecV1`, `ImpactManifestV1` |
| Produces | `11_change_plan__JOB__v1.json` |

---

## Phase 4 — Implementation & Verification (12–15)

### 12 · Code Update — **A** (coding, write-scoped)
*Code Synthesis*

The only step that mutates the repository. Two execution paths:

**In-process** (ollama / anthropic / openai / bedrock) — writes go through
`GuardedFS`, which refuses out-of-scope paths *before bytes reach disk*. This is
the safe path.

**Dev-tool CLI** (`edits_files_directly: true`) — the binary writes to the
workspace itself and never calls the guard. Step 12 therefore audits the
resulting diff via `audit_changeset()`. That is strictly weaker: the unwanted
edit already exists on disk, it just isn't committed yet.

| | |
|---|---|
| Consumes | `FeatureSpecV1`, `ChangePlanV1`, `ImpactManifestV1`, `RepoUnderstandingV1` |
| Produces | `12_code_changeset__JOB__v1.json`, `12_diff__JOB__v1.diff` |
| Status | `POLICY_VIOLATION` if the post-hoc audit found out-of-scope edits |
| Preconditions | BRD approved **and** an Impact Manifest exists |

`PolicyViolation` is in `retry.FATAL` — retrying a scope violation just violates
scope again.

---

### 13 · Code→Requirement Verification — **A** (reasoning, isolated)
*Traceability Verification*

Checks both directions:

- **Forward** — does every acceptance criterion have code behind it? (`missing`)
- **Backward** — does every code change trace to a criterion?
  (`unrelated_changes`, `hallucinated_functionality`)

The backward direction is the one teams forget, and it is where scope creep and
invented features are caught. A deterministic traceability matrix is built
first, so the model reasons over a small structured gap list rather than the raw
diff — which keeps its output stable across runs.

| | |
|---|---|
| Consumes | `BrdV1`, `CodeChangesetV1`, `FeatureSpecV1`, `ImpactManifestV1` |
| Produces | `13_requirement_coverage__JOB__v1.json` |
| Status | `FAILED` unless `verdict == PASSED` |
| Failure routes to | 12, max 3 loops |
| Isolation | must not be the model that ran step 12 |

---

### 14 · Static Quality Validation — **T**
*Deterministic Quality Gates*

No LLM anywhere in this step, on purpose. Compilation, lint, formatting, types
and architectural rules have exact answers. Asking a model to judge them costs
money, adds latency, and produces disagreement between runs on identical code.

Failures render to `.jpg` as well as `.json`, because the artifact convention
puts errors and visual snapshots in one class — so a reviewer sees lint failures
and Playwright screenshots side by side.

| | |
|---|---|
| Consumes | `CodeChangesetV1`, `ProjectContextV1` |
| Produces | `14_static_analysis__JOB__v1.json`, `14_failure__static__JOB__v1.jpg` |
| Failure routes to | 12, max 3 loops |

Missing tools are `skipped`, not failures — a machine without `mypy` shouldn't
block the pipeline.

---

### 15 · Unit Test Synchronisation — **A** (coding)
*Test Reconciliation*

Turns step 07's designs into executable test code against the implementation
that actually got written.

The distinction is the point: **07 is intent, 15 is mechanics.** If a design
cannot be expressed against the real code, that is evidence the *code* is wrong
— not licence to change the test's intent. Those cases go to `unimplementable`
rather than being silently dropped.

| | |
|---|---|
| Consumes | `TestDesignV1`, `CodeChangesetV1`, `FeatureSpecV1`, `ImpactManifestV1` |
| Produces | `15_test_sync__JOB__v1.json` + test files via a test-only `GuardedFS` |

---

## Phase 5 — Validation (16–19)

### 16 · Unit Test Execution — **P** (pytest)
*Test Execution*

Runs the suite and enforces coverage floors. Two numbers, and they are different:

- `line_pct` — whole-repo coverage. Drifts slowly, easy to game.
- `changed_line_pct` — coverage of files *this ticket* touched. The real signal.

| | |
|---|---|
| Consumes | `TestSyncV1`, `CodeChangesetV1` |
| Produces | `16_unit_test_report__JOB__v1.json`, `16_failure__unit__JOB__v1.jpg` |
| Status | `FAILED` on any failure or coverage below threshold |
| Failure routes to | 12, max 4 loops (the most generous budget in the pipeline) |

---

### 17 · Integration / E2E Testing — **P** (Playwright)
*Behavioural Validation*

Unit tests prove the units behave. Only this step proves the **feature**
behaves. It exercises UI → API → DB against an ephemeral environment, which is
where integration mistakes that every unit test happily passed finally surface.

Failure screenshots become `.jpg` artifacts and are linked into the PR, so a
human reviewer sees the actual broken screen rather than a stack trace.

| | |
|---|---|
| Consumes | `TestDesignV1`, `FeatureSpecV1`, `CodeChangesetV1` |
| Produces | `17_e2e_report__JOB__v1.json`, `17_e2e__failure_N__JOB__v1.jpg` |
| Failure routes to | 12, max 3 loops |

---

### 18 · Security & Dependency Scan — **P** ×3
*Static Security / Supply Chain*

Three independent scanners, all deterministic, all vendor-swappable from config:
`sast` (code patterns), `sca` (dependency CVEs), `secrets` (committed
credentials).

| | |
|---|---|
| Consumes | `CodeChangesetV1` |
| Produces | `18_sast__`, `18_sca__`, `18_secrets__JOB__v1.json` |
| Status | `BLOCKING_FINDINGS` at or above `policy.quality_thresholds.block_on_severity` |
| Failure routes to | 12, max 2 loops, + remediation tickets |

Secrets findings are hardcoded `CRITICAL` regardless of scanner opinion. A live
credential in a diff is never a medium-severity issue.

---

### 19 · DAST / Runtime Security — **P** + **A** (security)
*Runtime Security*

Kept separate from 18 deliberately: SAST reads code that might never execute;
DAST exercises code that definitely does. They disagree often, and both
disagreements are informative — a SAST finding DAST can't reproduce is probably
unreachable; a DAST finding SAST missed is usually configuration or auth.

The security-capability model triages raw scanner output into an exploitability
judgement, because raw ZAP output has a high false-positive rate and dumping it
into a PR trains reviewers to ignore the report.

| | |
|---|---|
| Consumes | `FeatureSpecV1`, `SecurityScanV1` |
| Produces | `19_dast_report__JOB__v1.json` |
| Status | `BLOCKING_FINDINGS` |
| Failure routes to | 12, max 2 loops |

Triage failure is caught and recorded — it is advisory, never fatal.

---

## Phase 6 — Documentation & Publication (20–23)

### 20 · Technical Design Document — **A** (reasoning) + **T**
*As-Built Design Documentation*

Written from the **verified implementation**, not the proposal. That ordering is
the difference between a TDD documenting what shipped and one documenting what
someone hoped would ship. It runs after tests and security precisely so it can
describe code that passed them.

Inputs deliberately include the test and security reports: a design document
that omits the security posture of the thing it designs is incomplete.

| | |
|---|---|
| Consumes | `FeatureSpecV1`, `CodeChangesetV1`, `RequirementCoverageV1`, `TestReportV1`, `SecurityScanV1` |
| Produces | `20_tdd__JOB__v1.md` + `.pdf` |

---

### 21 · Documentation Update — **A** (coding)
*Docs Synchronisation*

README, OpenAPI, developer docs, configuration notes. Runs after the TDD so it
can reuse those decisions rather than re-deriving them.

Writes go through a `GuardedFS` with a **docs-only** whitelist. A documentation
step that can edit source code is a documentation step that will eventually edit
source code.

| | |
|---|---|
| Consumes | `TechnicalDesignV1`, `FeatureSpecV1`, `CodeChangesetV1` |
| Produces | `21_doc_updates__JOB__v1.json` + doc files |

---

### 22 · Pull Request Creation — **P** (GitHub)
*VCS Publication*

The PR body is the **audit package**. It links every artifact the pipeline
produced, so the reviewer at step 24 can trace any line of code back through the
TDD, the spec, the impact manifest, the BRD, and finally the Jira story —
without leaving the PR.

Opens as a draft. It becomes a merge candidate only after gate 24.

| | |
|---|---|
| Consumes | `BrdV1`, `TechnicalDesignV1`, `CodeChangesetV1`, `TestReportV1`, `AiReviewV1` |
| Produces | `22_pull_request__JOB__v1.json` |

---

### 23 · AI Pull Request Review — **A** (reasoning, isolated)
*Independent Review*

Independence is enforced **mechanically**, not by convention.
`routing.isolation` lists step 23 as a reviewer of 12 and 15; `LLMRouter` checks
the journal for which model actually executed those steps and walks the fallback
chain if it would otherwise pick the same one.

A model reviewing its own output agrees with itself. That is not a review.

| | |
|---|---|
| Consumes | seven prior artifacts + the unified diff |
| Produces | `23_ai_review__JOB__v1.json` |
| Status | `CHANGES_REQUESTED` unless `verdict == APPROVED` |
| Failure routes to | 12, max 3 loops |

`post_process` carries a belt-and-braces check: if the reviewer model somehow
equals the author model, the verdict is forced to `CHANGES_REQUESTED`. A silent
self-approval would be worse than a loud failure.

---

## Phase 7 — The Second Gate (24)

### 24 · Human Review, Merge, Release Notes — **G** + **P** 🛑 MANDATORY
*HITL Approval / Merge / Release*

The second control configuration cannot reach. A human reads the PR — carrying
the whole audit package from step 22 — and decides. Only after `APPROVED` does
anything merge.

`block_if_open_findings` means an approval cannot accidentally override an
unresolved blocking security finding; that requires the explicit, role-
restricted, audited override path in `policy.override`.

| | |
|---|---|
| Consumes | `PullRequestV1`, `AiReviewV1`, `SecurityScanV1` |
| Produces | `24_merge_record__JOB__v1.json`, `24_release_notes__JOB__v1.md` |
| Status | `APPROVED` / `REJECTED` / `BLOCKED` |
| Failure routes to | 12, max 5 loops |

Release notes are generated from artifacts rather than from the diff, so they
describe intent rather than mechanics.

---

## The remediation graph

Every failure edge in one place. All eight live in
`config.pipeline.remediation_edges` — the topology is data, not control flow.

| From | On | To | Max loops |
|---|---|---|---|
| 13 | FAILED | 12 | 3 |
| 14 | FAILED | 12 | 3 |
| 16 | FAILED | 12 | 4 |
| 17 | FAILED | 12 | 3 |
| 18 | BLOCKING_FINDINGS | 12 | 2 |
| 19 | BLOCKING_FINDINGS | 12 | 2 |
| 23 | CHANGES_REQUESTED | 12 | 3 |
| 24 | REJECTED | 12 | 5 |

Two things follow. Every edge routes back to step 12 — because in this pipeline
almost every failure a machine can route is a code problem. The ones that are
not have no edge at all: a BRD rejection is a requirements problem, and it stops
the run until a human supplies a different document (see step 06). And because
every edge carries `max_loops`, an infinite remediation cycle is not something
you can write by accident: the runner escalates to the notifier and halts.
