---
description: Adversarially review the write guard for bypasses
---

Review `src/codegen_core/tools/file_write_guard.py` and `src/codegen_core/core/policy.py`
as an attacker trying to write outside the Impact Manifest whitelist.

Specifically check:
- Path traversal: `../`, symlinks, absolute paths, `..%2f`, unicode separators
- Glob semantics: does every `deny_glob` form actually match what it reads as?
  `**/` handling has already produced one real bug — look for siblings
- Budget accounting: can many small writes evade `max_changed_loc`? Does a
  failed write still increment the counter?
- Ordering: is deny checked before allow, everywhere?
- Bypass paths: anything in the codebase writing to `workspace/` without going
  through `GuardedFS`. Grep for `write_text`, `open(`, `shutil`, `subprocess`.
- The `cli_agent` gap: `audit_changeset()` runs after the fact. What can a
  dev-tool backend do that the audit will not catch?

For each finding, write a failing test in `tests/test_write_guard.py` first,
then fix it. Do not weaken a test to make it pass.
