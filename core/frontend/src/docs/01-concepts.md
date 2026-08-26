# Concepts

Read this before the code. Six ideas explain most of the design.

---

## 1. A step is not necessarily an agent

The most common mistake in agent pipelines is making everything an agent. An LLM
call is non-deterministic, costs money, adds latency, and introduces a
hallucination surface. It is the right tool only when the task genuinely
requires judgement.

CodeGen Core classifies every stage as one of four kinds:

| Kind | When | Example |
|---|---|---|
| **Agent** | Genuine judgement; no exact answer exists | Writing a BRD (05) |
| **Tool** | Exact answer exists; determinism matters | Lint and type checks (14) |
| **Plugin** | Adapting an external system | Running pytest (16) |
| **Gate** | A human must decide | BRD approval (06) |

Of 24 steps, 13 are agents. The other 11 would be *worse* as agents. Step 14 is
the clearest case: asking a model whether code compiles produces a slower,
costlier, occasionally-wrong answer to a question the compiler answers exactly.

The practical test: *if two runs on identical input should produce identical
output, it is not an agent.*

---

## 2. Typed envelopes, not shared state

Components never read each other's variables. Every exchange is an `Envelope`
carrying typed `Part`s, with provenance attached.

This matters for three reasons:

- **Traceability.** Every artifact records which model, which prompt hash, which
  parent message produced it. When step 23 disputes step 12, you can reconstruct
  exactly what step 12 saw.
- **Testability.** A step takes an envelope and returns an envelope. Testing it
  means constructing an envelope, not booting a pipeline.
- **Distribution.** The bus is in-process today. Because the boundary is already
  a serialisable message, moving a step to another service changes the transport
  and nothing else.

---

## 3. Modality agnosticism means senders don't adapt

A Jira ticket may carry screenshots. A Playwright failure produces images. A diff
is neither text nor JSON exactly. If each sender had to know what each receiver
could read, every component would need to know about every other component.

Instead, receivers declare `accepts` (mime types) and `negotiate.adapt()`
converts on delivery — image to caption via a vision model, PDF to markdown,
diff to structured hunks. The sender attaches whatever it has.

This is what makes "agent-to-agent, modality agnostic" a real property rather
than a slogan: a text-only local model can be handed a screenshot and will
receive a description of it.

---

## 4. Config decides *how much*; code decides *what*

`config.json` controls which model runs which step, which vendor implements
which capability, how many lines an agent may change, how failures route, how
long each step waits, and which roles may approve.

Code owns the step logic, the protocols, the schemas, and the safety invariants.

The dividing line is deliberate. You should be able to move step 12 from Claude
to a local Ollama model, or swap Semgrep for SonarQube, without a deploy. You
should *not* be able to disable a human gate that way.

---

## 5. Blast radius is bounded before the agent runs

Step 09 produces an Impact Manifest listing exactly which paths may change and
how many lines. Step 12 — the only step that mutates the repository — writes
exclusively through `GuardedFS`, which refuses anything outside that whitelist
*before the bytes reach disk*.

The ordering matters: the whitelist is decided by a model that has not yet
written any code it might want to protect. By the time the code agent runs, its
own limits were set by someone else.

There is one honest weakness. A `cli_agent` backend (Cursor, Claude Code) edits
files itself and never calls the guard. For those, step 12 audits the diff
afterwards, which is strictly weaker — the unwanted edit already exists on disk,
it just isn't committed. This is documented rather than hidden because choosing
a dev-tool backend is choosing that trade.

---

## 6. Two gates that configuration cannot reach

Almost everything is configurable. Two things are not: steps 06 and 24 must
exist, be enabled, and be gates. `AppConfig.assert_invariants()` rejects any
config where that is false, including via a profile overlay, and a test proves
it.

The reasoning is simple. A safety control that a config file can switch off is
not a control; it is a default. If the gates were configurable, the first
production incident under deadline pressure would remove them, and nothing in
the system would object.

Approvals are bound to `artifact_sha256`. Regenerating an approved BRD
invalidates its own approval, so "approved" always means "a human approved
*these exact bytes*".

---

## How these compose

```
Jira ticket
    ↓  (Plugin: deterministic ingestion)
Typed analysis, gaps surfaced not filled
    ↓  (Agents: judgement, one concern at a time)
BRD  ──────────► 🛑 HUMAN GATE 06 ──── rejected ──┐
    ↓ approved                                     │
Tests designed from requirements, before code       │
    ↓                                               │
Impact Manifest = the write whitelist               │
    ↓                                               │
Code, written only inside that whitelist ◄──────────┤ remediation
    ↓                                               │ (bounded by max_loops)
Verification, tests, security ─── failure ──────────┘
    ↓ all pass
PR carrying every artifact
    ↓
Independent AI review (different model, enforced)
    ↓
🛑 HUMAN GATE 24 ─► merge + release notes
```
