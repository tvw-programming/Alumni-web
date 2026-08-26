# Working on CodeGen Core with Claude Code

This repository is set up so an agent can work on it productively without
needing the whole design explained each session. Three mechanisms do that work:
`CLAUDE.md`, `.claude/settings.json`, and four slash commands.

---

## CLAUDE.md — the standing context

Claude Code reads `CLAUDE.md` at the start of every session. It is deliberately
short and states three things: how to run the project, the six non-negotiable
rules, and the known sharp edges.

The rules are written as absolutes because they are absolutes:

> **Steps 06 and 24 cannot be disabled.** Not by config, not by a profile
> overlay, not by a flag. Never add an escape hatch.

That phrasing matters. "Prefer not to disable the gates" invites negotiation
under deadline pressure. "Never add an escape hatch" does not.

The **known sharp edges** section is the highest-value part. It lists three
things that have already caused real bugs — the `cli_agent` guard bypass, the
`**/` glob gap, and the mock backend's dependence on
`_base.SCHEMA_INSTRUCTION`. Every one of those is a trap an agent would
otherwise rediscover the expensive way.

---

## Settings — permissions, not trust

`.claude/settings.json` pre-approves the commands you will run twenty times a
session and blocks the ones that should be deliberate:

```json
{
  "permissions": {
    "allow": ["Bash(pytest*)", "Bash(codegen-core *)", "Bash(ruff*)",
              "Bash(git diff*)", "Bash(git status*)"],
    "deny":  ["Bash(rm -rf*)", "Read(./.env)", "Read(./**/*.pem)",
              "Write(./config/config.json)"]
  },
  "env": { "CODEGEN_PROFILE": "local", "PYTHONPATH": "src" }
}
```

Two choices worth explaining.

`Write(./config/config.json)` is denied even though config edits are routine.
That file controls the write whitelist, the routing, and the gate roles — an
agent editing it directly can widen its own blast radius. Config changes should
be a conversation, not a side effect.

`CODEGEN_PROFILE=local` in `env` means every command an agent runs is offline
and free by default. An agent debugging a step cannot accidentally spend forty
dollars discovering that the fix works.

---

## The four commands

### `/new-step <NN> <name> <kind>`

Scaffolds a step across all seven places it must exist: the step file, the
schema, the mock stub, two config entries, the prompt, and a test.

The step that gets forgotten by hand is the **mock stub**. Without it the
offline run fails at the new step, which looks like a broken pipeline rather
than a missing fixture. Encoding it in the command means it is never skipped.

The command also carries the docstring convention: explain *why* this step is
that component kind rather than another, and it points at
`09_impact_analysis.py` as the reference for tone.

### `/add-backend <id> <vendor>`

Starts by asking whether code is needed at all — which, for most vendors, it is
not. It walks the decision (OpenAI-compatible? headless CLI? genuinely new
protocol?) and then the config block, including the reminder that secrets are
`token_env` references and a literal key fails validation at boot.

### `/trace-job <JOB-ID>`

A read-only investigation. Reads the journal, the artifact index, and the
relevant artifacts, then reports where the run halted, which model ran each
step, whether reviewer isolation held, both gate decisions with their SHAs, and
which loop budget was exhausted.

Explicitly read-only. When a pipeline fails, the instinct to re-run it destroys
the evidence.

### `/audit-guard`

An adversarial review of `file_write_guard.py` and `policy.py`, with a specific
list of attack surfaces: traversal, glob semantics, budget accounting, ordering,
and any code writing to `workspace/` without the guard.

It instructs writing the failing test *first*, then fixing — and closes with
"do not weaken a test to make it pass", which is the failure mode that matters.
The `**/` glob bug is named in the command as a hint that siblings exist.

---

## How the offline profile changes the loop

The `local` profile routes every capability to the `mock` driver and dry-runs
every plugin. The full 24-step pipeline runs in about two seconds for $0.

That single property changes how you work on this codebase. The verification
loop after any change is:

```bash
codegen-core config validate
pytest -q
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
```

The third command is the real check — it exercises all 24 steps, both gates, the
artifact conventions, the router and the policy engine. Because it is fast and
free, an agent can run it after every edit rather than batching changes and
debugging a compound failure.

`CODEGEN_AUTO_APPROVE=1` pre-seeds the gate decision files so the pipeline does
not block on a human. Setting it to `reject` exercises the rejection path
instead, which is how `test_pipeline_halts_when_the_brd_gate_rejects` works.

---

## Using CodeGen Core *with* Claude Code as a backend

Separate from developing the repo: you can route step 12 to Claude Code itself.

```json
"devtool.claude_code": {
  "driver": "cli_agent",
  "tier": "dev_tool",
  "command": "claude",
  "argv": ["-p", "{prompt}", "--output-format", "json", "--cwd", "{workspace}"],
  "result_json_path": "$.result",
  "edits_files_directly": true,
  "capabilities": ["coding"]
}
```

Then `CODEGEN_PROFILE=devtool codegen-core run PROJ-123`.

Understand the trade before you do. `edits_files_directly: true` means the binary
writes to the workspace itself and **never calls `GuardedFS`**. Step 12 falls
back to `audit_changeset()` on the resulting diff — the same rules, applied
after the fact. The unwanted edit exists on disk; it is merely uncommitted.

That is a reasonable trade when you want a strong coding agent and have review
downstream. It is the wrong trade when the whitelist is the control you are
relying on. Route step 12 to an in-process backend in that case.

---

## What was actually caught this way

Five defects surfaced by running the code rather than reading it, during the
initial build:

| Defect | How it surfaced |
|---|---|
| Mock matched input schema, not output schema | Step 05 crashed validating `BrdV1` |
| PDF escaping mangled `</b>` | reportlab `ValueError` at step 05 |
| Version counter shared across extensions | `v1.json`, `v2.md`, `v3.pdf` in the listing |
| Doubled job-id prefix | `DEEP-DEEP-1042-fb714e` |
| **Deny globs missed root-level files** | `test_deny_glob_beats_whitelist` failed |

The last one is a real security gap that no amount of reading the code would
have found — `fnmatch("**/.env*", ".env.production")` returns `False`, silently.
A test written to assert an obvious property caught it.

That ratio is the argument for the offline profile: the cost of running the
whole pipeline is two seconds, and it finds things review does not.
