"""The single most safety-critical module in CodeGen Core.

Every write an agent performs goes through GuardedFS. It enforces, in order:

  1. path is inside the workspace (no traversal out)
  2. path does not match any config.policy.write_scope.deny_globs
  3. path matches at least one glob from the step-09 Impact Manifest whitelist
  4. cumulative file count and changed-LOC stay inside budget
  5. migrations are blocked unless a human has signed off

Two agents cannot share a guard: each job gets its own instance so the budget
counters are per-job.

LIMITATION worth understanding: a cli_agent backend with edits_files_directly=true
writes to disk itself and never calls this class. For those, audit_changeset()
below performs the same checks AFTER the fact, against the resulting diff. That
is strictly weaker - the damage is already on disk, just not yet committed - so
prefer in-process tools when the whitelist matters.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from ..core.errors import PolicyViolation


class GuardedFS:
    def __init__(
        self,
        root: Path,
        allowed_globs: list[str],
        policy: Any,
        loc_budget: int,
    ) -> None:
        self.root = Path(root).resolve()
        self.allowed = allowed_globs
        self.policy = policy
        self.loc_budget = loc_budget
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
        return f"wrote {rel_path} ({len(content.splitlines())} lines)"

    def edit_file(self, rel_path: str, old: str, new: str) -> str:
        target = self._resolve(rel_path)
        body = target.read_text()
        if body.count(old) != 1:
            raise ValueError(f"old string must appear exactly once in {rel_path}")
        updated = body.replace(old, new)
        self._account(rel_path, new, True)
        target.write_text(updated)
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
    """Post-hoc check for dev-tool backends that wrote to disk themselves.

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
