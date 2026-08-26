# ADR 0002 — One config.json, not eleven YAML files

**Status:** Accepted · **Date:** 2026-08 · **Supersedes:** blueprint v1 config layout

## Context

Blueprint v1 split configuration across eleven YAML files — `models.yaml`,
`routing.yaml`, `steps.yaml`, `policy.yaml`, and so on. The requirement for v2
was that changing `config.json` alone should be enough to run any combination of
backend tiers.

## Decision

One file: `config/config.json`, with named `profiles` as overlays. Prompt *text*
stays outside it in `config/prompts/*.md`.

## Reasoning

**Cross-file invariants were unenforceable.** "Step 23 must not use the model
step 12 used" spans `routing.yaml` and `steps.yaml`. With separate files you
either load all of them to validate anything, or you skip validation. One
document means `assert_invariants()` sees everything at boot.

**Profiles need to span sections.** Switching from local to production changes
routing, plugin vendors, coverage thresholds, gate quorum and secret provider at
once. As eleven files that is eleven coordinated edits, and any subset of them
is a valid-looking broken state. As one overlay it is atomic.

**JSON over YAML.** JSON has one way to write things. YAML's implicit typing
(`no` → `False`, `1.0` → float) and multiple string syntaxes are unhelpful in a
file where a wrong type silently changes a safety threshold. A `config.schema.json`
gives editor completion for free.

**Prompts are the exception.** Multi-line markdown inside JSON is unreviewable —
escaped newlines, no syntax highlighting, unreadable diffs. Config stores the
*filename*; the text lives in `config/prompts/`, so a profile can swap prompt
variants and prompt changes show up as normal markdown diffs.

## Consequences

**Good.** All invariants checkable at boot. One env var switches an entire
environment. `codegen-core config explain --step 12` resolves the full chain because
one object holds it. Adding a vendor on an existing protocol is a JSON block
with no code.

**Bad.** The file is ~900 lines. Merge conflicts concentrate in it. Mitigations:
sections are ordered and stable, profiles isolate most environment churn, and
`config.schema.json` catches structural mistakes before the loader runs.

**Rejected alternative.** Splitting by *lifecycle* (rarely-changed vs
frequently-changed) rather than by domain. It fixes the merge-conflict surface
but reintroduces the cross-file invariant problem, which is the more expensive
of the two.
