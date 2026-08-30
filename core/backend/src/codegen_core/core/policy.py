"""Policy enforcement.

Config decides *how much* an agent may do; this module decides whether a given
action is inside those limits. Two responsibilities:

  1. preconditions - has the required gate been approved before this step runs?
  2. write scope   - is this path inside the Impact Manifest whitelist?

The gate check is deliberately duplicated here even though the runner also
checks it: defence in depth on the only two human controls in the system.
"""

from __future__ import annotations

import fnmatch
from pathlib import Path
from typing import Any

from .errors import BudgetExceeded, PolicyViolation

#: Steps that may not run until the BRD gate (06) has been approved.
POST_BRD_STEPS = range(7, 25)
#: Steps that may not run until the PR gate (24) has been approved.
POST_PR_ACTIONS = ("merge", "release")


class PolicyEngine:
    def __init__(self, cfg: Any, journal: Any) -> None:
        self.cfg = cfg
        self.journal = journal

    # ------------------------------------------------------------------ #
    def assert_preconditions(self, step: int, ctx: Any) -> None:
        if step in POST_BRD_STEPS and not self._gate_approved(6):
            raise PolicyViolation(
                f"step {step:02d} requires BRD approval (step 06) which has not been granted"
            )
        if step >= 12 and ctx.impact_manifest is None:
            raise PolicyViolation(
                f"step {step:02d} requires an Impact Manifest from step 09 to bound its write scope"
            )
        self.assert_budget()

    def assert_action(self, step: int, action: str) -> None:
        """Refuse an action the step's profile does not grant.

        Deny by default: a step with no `allowed_actions` may only read. That
        way a profile someone forgot to write fails closed, which is the
        opposite of the usual configuration accident.

        This runs in-process and is therefore advisory for a backend that shells
        out — see ADR 0004. The gateway enforces the same list where it can
        actually bind.
        """
        cfg = self.cfg.step_cfg(step)
        allowed = set(cfg.allowed_actions) or {"read"}

        if action not in allowed:
            raise PolicyViolation(
                f"step {step:02d} is not permitted to {action}; "
                f"its profile allows {sorted(allowed)}"
            )

    def assert_tool(self, step: int, tool: str) -> None:
        """Refuse a tool the step's profile names as prohibited."""
        prohibited = set(self.cfg.step_cfg(step).prohibited_tools)
        if tool in prohibited:
            raise PolicyViolation(
                f"step {step:02d} is prohibited from using {tool!r}"
            )

    def _gate_approved(self, step: int) -> bool:
        """The *latest* decision on a gate, not any decision it ever carried.

        A gate can be decided more than once — rejected, answered with a new
        document, decided again — so an approval anywhere in the record is not
        the question. The question is whether the gate stands approved now.
        """
        decisions = [
            e for e in self.journal.entries()
            if e.get("type") == "approval" and e.get("step") == step
        ]
        return bool(decisions) and decisions[-1].get("status") == "APPROVED"

    def assert_budget(self) -> None:
        cap = self.cfg.routing.budgets.per_job_usd
        if cap and self.journal.total_cost_usd() > cap:
            raise BudgetExceeded(f"job cost {self.journal.total_cost_usd()} exceeds cap {cap}")

    # ------------------------------------------------------------------ #
    @staticmethod
    def _glob_match(rel_path: str, pattern: str) -> bool:
        """fnmatch with `**/` treated as "any depth, including none".

        Plain fnmatch fails to match `**/.env*` against a top-level `.env.prod`,
        because the pattern demands a separator. For a deny list that gap is a
        hole, so `**/x` is also tested against the path with the prefix stripped.
        """
        if fnmatch.fnmatch(rel_path, pattern):
            return True
        if pattern.startswith("**/") and fnmatch.fnmatch(rel_path, pattern[3:]):
            return True
        # also match a deny pattern against any path segment boundary
        return pattern.startswith("**/") and any(
            fnmatch.fnmatch(rel_path[i + 1:], pattern[3:])
            for i, ch in enumerate(rel_path) if ch == "/"
        )

    def check_path(self, rel_path: str, allowed_globs: list[str]) -> None:
        """Raise unless rel_path is inside the whitelist and outside every deny glob."""
        scope = self.cfg.policy.write_scope
        for deny in scope.deny_globs:
            if self._glob_match(rel_path, deny):
                raise PolicyViolation(f"path '{rel_path}' matches deny glob '{deny}'")
        if not any(fnmatch.fnmatch(rel_path, g) for g in allowed_globs):
            raise PolicyViolation(
                f"path '{rel_path}' is outside the Impact Manifest whitelist {allowed_globs}"
            )
        if scope.migrations_require_human_signoff and "migration" in rel_path.lower():
            raise PolicyViolation(
                f"path '{rel_path}' looks like a migration; those need explicit human signoff"
            )

    def check_changeset(self, changed_files: list[str], changed_loc: int) -> None:
        scope = self.cfg.policy.write_scope
        if len(changed_files) > scope.max_changed_files:
            raise PolicyViolation(
                f"{len(changed_files)} files changed, cap is {scope.max_changed_files}"
            )
        if changed_loc > scope.max_changed_loc:
            raise PolicyViolation(f"{changed_loc} lines changed, cap is {scope.max_changed_loc}")

    def blocking_severities(self) -> list[str]:
        return self.cfg.policy.quality_thresholds.block_on_severity
