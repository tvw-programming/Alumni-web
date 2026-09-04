"""The single most safety-critical module in CodeGen Core.

Every write an agent performs goes through GuardedFS. It enforces, in order:

  1. path is inside the workspace (no traversal out)
  2. path does not match any config.policy.write_scope.deny_globs
  3. path matches at least one glob from the step-09 Impact Manifest whitelist
  4. cumulative file count and changed-LOC stay inside budget
  5. migrations are blocked unless a human has signed off

Two agents cannot share a guard: each job gets its own instance so the budget
counters are per-job.

In **prod** profile, backends with `edits_files_directly=true` are refused
(`ErrDirectWriteProhibited`) — in-process GuardedFS is the only write path.
Local profile may still use CLI backends for development, with post-hoc audit.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Callable

from ..core.errors import DirectWriteProhibited, ErrDirectWriteProhibited, PolicyViolation
from ..core.telemetry import log

__all__ = [
    "GuardedFS",
    "AuditResult",
    "make_guarded_fs_tools",
    "audit_changeset",
    "assert_direct_writes_allowed",
    "DirectWriteProhibited",
    "ErrDirectWriteProhibited",
]


def assert_direct_writes_allowed(cfg: Any, *, backend_id: str = "") -> None:
    """Refuse `edits_files_directly` backends under the prod profile."""
    profile = getattr(cfg, "active_profile", None) or "local"
    if str(profile).lower() in {"prod", "production"}:
        raise ErrDirectWriteProhibited(
            f"backend {backend_id or '<cli>'!r} sets edits_files_directly=true, which is "
            f"prohibited under profile {profile!r}. In-process GuardedFS is the only "
            f"production write path."
        )


class AuditResult:
    """Outcome of a post-hoc CLI / gateway write audit."""

    def __init__(
        self,
        *,
        violations: list[str] | None = None,
        changed_files: list[str] | None = None,
        used_guarded_fs: bool = True,
    ) -> None:
        self.violations = list(violations or [])
        self.changed_files = list(changed_files or [])
        self.used_guarded_fs = used_guarded_fs

    @property
    def ok(self) -> bool:
        return not self.violations


class GuardedFS:
    def __init__(
        self,
        root: Path,
        allowed_globs: list[str],
        policy: Any,
        loc_budget: int,
        *,
        author: str = "agent",
        step: int | None = None,
        trace_id: str | None = None,
        journal: Any = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.allowed = allowed_globs
        self.policy = policy
        self.loc_budget = loc_budget
        self.author = author
        self.step = step
        self.trace_id = trace_id
        self.journal = journal
        self.changed_files: set[str] = set()
        self.created_files: set[str] = set()
        self.changed_loc = 0

    # ------------------------------------------------------------------ #
    def _resolve(self, rel_path: str) -> Path:
        target = (self.root / rel_path).resolve()
        if not str(target).startswith(str(self.root)):
            raise PolicyViolation(f"path escapes the workspace: {rel_path}")
        self.policy.check_path(rel_path, self.allowed)
        return target

    def _account(self, rel_path: str, new_text: str, existed: bool) -> None:
        delta = len(new_text.splitlines())
        self.changed_loc += delta
        (self.changed_files if existed else self.created_files).add(rel_path)
        self.policy.check_changeset(
            sorted(self.changed_files | self.created_files), self.changed_loc
        )
        if self.changed_loc > self.loc_budget:
            raise PolicyViolation(
                f"changed {self.changed_loc} lines, Impact Manifest budget is {self.loc_budget}"
            )

    def _audit_write(self, rel_path: str, content: str) -> None:
        digest = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
        fields = {
            "author": self.author,
            "step": self.step,
            "path": rel_path,
            "sha256": digest,
            "trace_id": self.trace_id,
        }
        log.info(
            "guardedfs write",
            extra={"extra_fields": fields},
        )
        if self.journal is not None:
            self.journal.append_event("guardedfs_write", **fields)

    # ------------------------------------------------------------------ #
    def read_file(self, rel_path: str) -> str:
        target = (self.root / rel_path).resolve()
        if not str(target).startswith(str(self.root)):
            raise PolicyViolation(f"path escapes the workspace: {rel_path}")
        if not target.exists():
            raise FileNotFoundError(rel_path)
        return target.read_text()

    def write_file(self, rel_path: str, content: str) -> str:
        target = self._resolve(rel_path)
        existed = target.exists()
        self._account(rel_path, content, existed)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        self._audit_write(rel_path, content)
        return f"wrote {rel_path} ({len(content.splitlines())} lines)"

    def edit_file(self, rel_path: str, old: str, new: str) -> str:
        target = self._resolve(rel_path)
        body = target.read_text()
        if body.count(old) != 1:
            raise ValueError(f"old string must appear exactly once in {rel_path}")
        updated = body.replace(old, new)
        self._account(rel_path, new, True)
        target.write_text(updated)
        self._audit_write(rel_path, updated)
        return f"edited {rel_path}"

    def ls(self, rel_path: str = ".") -> list[str]:
        base = (self.root / rel_path).resolve()
        return sorted(p.relative_to(self.root).as_posix() for p in base.rglob("*") if p.is_file())

    def summary(self) -> dict[str, Any]:
        return {
            "changed_files": sorted(self.changed_files),
            "created_files": sorted(self.created_files),
            "changed_loc": self.changed_loc,
        }


def make_guarded_fs_tools(guard: GuardedFS) -> list[Callable]:
    """Expose the guard as plain callables an agent framework can wrap as tools."""
    return [guard.read_file, guard.write_file, guard.edit_file, guard.ls]


def audit_changeset(changeset: dict, allowed_globs: list[str], policy: Any) -> list[str]:
    """Post-hoc check for local-only CLI backends that wrote to disk themselves.

    Returns the list of violations rather than raising, so the caller can decide
    whether to revert, fail the step, or open a remediation ticket.
    """
    violations: list[str] = []
    files = list(changeset.get("changed_files", [])) + list(changeset.get("created_files", []))
    for f in files:
        try:
            policy.check_path(f, allowed_globs)
        except PolicyViolation as exc:
            violations.append(str(exc))
    try:
        policy.check_changeset(files, changeset.get("changed_loc", 0))
    except PolicyViolation as exc:
        violations.append(str(exc))
    return violations
