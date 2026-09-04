"""CLI-backend path for step 12.

Production profile refuses `edits_files_directly` (ErrDirectWriteProhibited).
Local profile may run the CLI, then audits the resulting changeset with the
same policy GuardedFS uses — never treating post-hoc audit as a prod write path.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from codegen_core.tools.file_write_guard import (
    AuditResult,
    GuardedFS,
    assert_direct_writes_allowed,
    audit_changeset,
)


@dataclass
class CliAuditOutcome:
    completion: Any
    transcript: str
    audit: AuditResult


def run_cli_audit(
    ctx: Any,
    *,
    backend: Any,
    system: str,
    user: str,
    guard: GuardedFS,
    manifest: dict,
) -> CliAuditOutcome:
    """Execute a direct-write CLI backend (local only) and audit via GuardedFS policy."""
    assert_direct_writes_allowed(ctx.cfg, backend_id=getattr(backend, "id", ""))

    completion = backend.complete(system, user, workspace=str(ctx.workspace))
    transcript = completion.text

    from codegen_core.plugins.factory import build_plugin

    vcs = build_plugin(ctx.cfg, "vcs", ctx)
    changeset = vcs.snapshot_changes(ctx.workspace)
    if not changeset.get("changed_files") and not changeset.get("created_files"):
        changeset.update(guard.summary())

    # Re-check every touched path through the same policy GuardedFS uses.
    violations = audit_changeset(changeset, manifest["allowed_paths"], ctx.policy)
    # Additionally resolve each path via the live guard (path + deny globs).
    for rel in list(changeset.get("changed_files", [])) + list(changeset.get("created_files", [])):
        try:
            guard._resolve(rel)  # noqa: SLF001 - intentional GuardedFS adapter check
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            if msg not in violations:
                violations.append(msg)

    audit = AuditResult(
        violations=violations,
        changed_files=list(changeset.get("changed_files", []))
        + list(changeset.get("created_files", [])),
        used_guarded_fs=True,
    )
    ctx.journal.append_event(
        "cli_audit",
        step=12,
        backend=getattr(backend, "id", None),
        violations=audit.violations,
        changed_files=audit.changed_files,
        used_guarded_fs=True,
    )
    return CliAuditOutcome(completion=completion, transcript=transcript, audit=audit)
