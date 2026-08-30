# Mutation inventory

Every path that changes state outside the process, and whether `GuardedFS`
constrains it. Read from the tree, not from documentation. Required by ADR 0004;
the gateway rollout closes the rows marked **bypass**.

## Verdicts

| Verdict | Meaning |
|---|---|
| **guarded** | Goes through `GuardedFS`. Path, deny-glob, whitelist, LOC budget and migration signoff all apply. |
| **bypass** | Writes to the project without calling `GuardedFS`. The gap ADR 0004 exists to close. |
| **audited** | Checked after the fact against the resulting diff. Strictly weaker — the edit is already on disk. |
| **internal** | Writes only to `/data` (artifacts, runs, ledger). Never touches the project under test. |
| **external** | Changes state in another system. Outside `GuardedFS` by nature; controlled by `dry_run` today. |

## The project under test

| Path | Steps | Verdict | Notes |
|---|---|---|---|
| `GuardedFS.write_file` / `patch_file` | 12, 15, 21 | **guarded** | `tools/file_write_guard.py:79,89` — the only sanctioned writer |
| `cli_agent` backend subprocess | 12 | **bypass** | `llm/backends/cli_agent.py:48` — `devtool.cursor`, `devtool.copilot` with `edits_files_directly: true`. Both `enabled: false` today; **enabling either removes whitelist enforcement with no code change.** |
| `audit_changeset()` | 12 | **audited** | Same checks, after the write. Catches the violation; does not prevent it |
| `git` invocation | 12, 22 | read-only | `tools/diff_tools.py:15` — `diff`/`status` only, no `commit`/`push` |

## Internal state — `/data`, never the project

| Path | Verdict | Notes |
|---|---|---|
| `core/artifacts.py:188,307,311` | internal | Artifact bytes, index, workspace cleanup |
| `core/ledger.py:91,157` | internal | Story ledger and replayed artifact copies |
| `core/journal.py` | internal | Append-only NDJSON. Never truncated |
| `plugins/hitl_dashboard.py:36,118,140,161` | internal | Gate tickets and decisions under `/data/runs` |

## External systems — plugin steps

All six PLUGIN steps reach another system. `GuardedFS` does not and cannot apply;
the control today is the per-plugin `dry_run` flag in config.

| Step | Plugin | Mutates | `dry_run` in `docker*` profiles |
|---|---|---|---|
| 01 | `tracker_jira` / `tracker_file` | reads a ticket | read-only regardless |
| 16 | `test_pytest` | runs a test process | `false` — executes |
| 17 | `e2e_playwright` | runs a browser suite | `true` |
| 18 | `sca_trivy`, `secrets_gitleaks`, `sast_semgrep` | scans, writes reports | `true` |
| 19 | `dast_zap` | probes a running target | `true` |
| 22 | `vcs_github` | **opens a pull request** | `true` |
| — | `notify_slack` | posts a message | `true` |

**Two rows deserve attention.** Step 16 executes a test process against the
project with `dry_run: false` — arbitrary code execution by design, since running
tests is the point, but it is not sandboxed beyond the container. Step 22 is the
only plugin that mutates a system of record; it is `dry_run: true` in every
docker profile, and turning that off is a decision that should be made
deliberately rather than inherited from a profile edit.

## Risk levels and allowed actions

Feeds `config.steps.NN.risk_level` and `allowed_actions` (Phase 4). Deny by
default: a step with no declared actions may only `read`.

| Step | Kind | Risk | Allowed actions |
|---:|---|---|---|
| 01 | PLUGIN | low | `read` |
| 02 | AGENT | low | `read`, `create_artifact` |
| 03 | AGENT | low | `read`, `create_artifact` |
| 04 | AGENT | low | `read`, `create_artifact` |
| 05 | AGENT | low | `read`, `create_artifact` |
| 06 | GATE | — | `approve` |
| 07 | AGENT | low | `read`, `create_artifact` |
| 08 | AGENT | low | `read`, `create_artifact` |
| 09 | AGENT | medium | `read`, `create_artifact` — defines the write whitelist every later step is bounded by |
| 10 | AGENT | low | `read`, `create_artifact` |
| 11 | AGENT | low | `read`, `create_artifact` |
| 12 | AGENT | **critical** | `read`, `create_artifact`, `apply_patch` |
| 13 | AGENT | medium | `read`, `create_artifact` — reviewer; isolation applies |
| 14 | TOOL | low | `read`, `create_artifact` |
| 15 | AGENT | high | `read`, `create_artifact`, `apply_patch` |
| 16 | PLUGIN | medium | `read`, `create_artifact`, `run_test` |
| 17 | PLUGIN | medium | `read`, `create_artifact`, `run_test` |
| 18 | PLUGIN | low | `read`, `create_artifact`, `run_scan` |
| 19 | PLUGIN | medium | `read`, `create_artifact`, `run_scan` |
| 20 | AGENT | low | `read`, `create_artifact` |
| 21 | AGENT | high | `read`, `create_artifact`, `apply_patch` |
| 22 | PLUGIN | high | `read`, `create_artifact`, `publish` |
| 23 | AGENT | medium | `read`, `create_artifact` — reviewer; isolation applies |
| 24 | GATE | — | `approve` |

Step 09 is `medium` rather than `low` despite writing no code: it produces the
Impact Manifest, and every whitelist `GuardedFS` enforces afterwards comes from
it. A too-permissive manifest widens what steps 12, 15 and 21 may touch.
