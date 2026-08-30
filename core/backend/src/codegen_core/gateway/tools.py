"""The gateway's read-only operations.

Named operations, never a general one. There is no `shell.execute`, no
`filesystem.write`, no `http.request` and no `database.execute` here, and adding
one would defeat the purpose of the gateway existing: a general tool is an
arbitrary-code-execution boundary wearing a schema.

Every function is a plain call taking verified claims. The MCP protocol adapter
in `server.py` is a thin wrapper over these, so the safety logic is testable
without speaking MCP — and so a second transport later cannot accidentally get
a different policy.

**Deny globs apply to reads.** `config.policy.write_scope.deny_globs` was
written to stop writes to `**/.env*`, `**/*.pem` and `**/secrets/**`. Those
patterns matter at least as much on the way out: a read gateway that will hand
over a private key is an exfiltration endpoint. The same list is loaded from the
same config — ADR 0004's "one source of policy" — rather than restated here.
"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..core.errors import PolicyViolation
from .tokens import WorkflowClaims

#: A single file read has to fit in a model's context to be useful, and an
#: unbounded read is a denial-of-service against the caller as much as the host.
MAX_READ_BYTES = 256 * 1024

#: Directories never worth traversing, and expensive when they are large.
SKIP_DIRS = frozenset(
    {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".mypy_cache"}
)


class GatewayDenied(PolicyViolation):
    """A request that policy refuses.

    A PolicyViolation so the runner halts on it through the same path as an
    in-process refusal — a boundary that raises an exception family the
    orchestrator does not know about is a boundary that crashes rather than
    stops.
    """


@dataclass(frozen=True)
class ReadResult:
    path: str
    content: str
    bytes_read: int
    truncated: bool


def _deny_globs(cfg: Any) -> list[str]:
    """The pipeline's own list. Not a copy — a copy drifts."""
    return list(cfg.policy.write_scope.deny_globs)


def _glob_match(rel_path: str, pattern: str) -> bool:
    """`**/x` matches a top-level `x`, which bare fnmatch does not.

    Mirrors `PolicyEngine._glob_match`. The duplication is deliberate and
    narrow: importing the engine would drag the journal and the whole config
    object into a process that needs neither, and this is eight lines with a
    test that pins it against the original's behaviour.
    """
    if fnmatch.fnmatch(rel_path, pattern):
        return True
    if pattern.startswith("**/"):
        return fnmatch.fnmatch(rel_path, pattern[3:]) or any(
            fnmatch.fnmatch(rel_path[i + 1 :], pattern[3:])
            for i, ch in enumerate(rel_path)
            if ch == "/"
        )
    return False


def resolve_in_root(root: Path, rel_path: str) -> Path:
    """Resolve a caller-supplied path, or refuse it.

    Traversal, absolute paths and symlinks that leave the root are all refused
    here rather than deeper in, because a path that has already been opened is
    a path that has already leaked.
    """
    if not rel_path or rel_path.strip() != rel_path:
        raise GatewayDenied("path is empty or padded")

    candidate = Path(rel_path)
    if candidate.is_absolute():
        raise GatewayDenied(f"absolute paths are not accepted: {rel_path!r}")
    if any(part == ".." for part in candidate.parts):
        raise GatewayDenied(f"path traversal is not accepted: {rel_path!r}")

    root = root.resolve()
    # strict=False so a missing file reports as missing rather than as an
    # escape; resolve() still follows symlinks, which is the check that matters.
    target = (root / candidate).resolve(strict=False)
    if not target.is_relative_to(root):
        raise GatewayDenied(f"path escapes the project root: {rel_path!r}")
    return target


def assert_readable(cfg: Any, rel_path: str) -> None:
    """Refuse a read that policy would have refused as a write.

    A gateway that will not let an agent *write* `.env` but will happily read it
    out has not protected the secret, only its modification time.
    """
    for pattern in _deny_globs(cfg):
        if _glob_match(rel_path, pattern):
            raise GatewayDenied(f"path {rel_path!r} matches deny glob {pattern!r}")


# --------------------------------------------------------------------------- #
# repo.read_file
# --------------------------------------------------------------------------- #
def read_file(cfg: Any, claims: WorkflowClaims, path: str) -> ReadResult:
    root = Path(claims.project_root)
    assert_readable(cfg, path)
    target = resolve_in_root(root, path)

    if not target.is_file():
        raise GatewayDenied(f"no such file: {path!r}")

    raw = target.read_bytes()
    truncated = len(raw) > MAX_READ_BYTES
    body = raw[:MAX_READ_BYTES].decode("utf-8", errors="replace")
    return ReadResult(path=path, content=body, bytes_read=len(raw), truncated=truncated)


# --------------------------------------------------------------------------- #
# repo.get_status
# --------------------------------------------------------------------------- #
def get_status(cfg: Any, claims: WorkflowClaims, limit: int = 500) -> dict[str, Any]:
    """What is in the project, filtered by the same deny list.

    Deliberately not `git status`: shelling out to git from the gateway would
    reintroduce a subprocess, and the list of files is what a caller actually
    needs at this stage.
    """
    root = Path(claims.project_root).resolve()
    if not root.is_dir():
        raise GatewayDenied("project root is not a directory")

    files: list[str] = []
    for entry in sorted(root.rglob("*")):
        if len(files) >= limit:
            break
        if not entry.is_file():
            continue
        if SKIP_DIRS & set(entry.relative_to(root).parts):
            continue
        rel = entry.relative_to(root).as_posix()
        # A denied path is omitted entirely rather than listed-but-unreadable:
        # the filename itself can be the secret.
        if any(_glob_match(rel, pattern) for pattern in _deny_globs(cfg)):
            continue
        files.append(rel)

    return {"root": str(root), "file_count": len(files), "files": files, "truncated": len(files) >= limit}


# --------------------------------------------------------------------------- #
# project.get_step_artifacts
# --------------------------------------------------------------------------- #
def get_step_artifacts(cfg: Any, claims: WorkflowClaims, step: int) -> dict[str, Any]:
    """Artifacts a previous step produced, for this run only.

    Scoped to `claims.run_id`: a token for one run must not read another run's
    artifacts, and the run id is the one field an agent would most like to
    choose for itself.
    """
    if not 1 <= step <= 24:
        raise GatewayDenied(f"step {step} is outside the pipeline")

    root = Path(cfg.app.paths.artifacts.format(job_id=claims.run_id))
    if not root.is_dir():
        return {"run_id": claims.run_id, "step": step, "artifacts": []}

    prefix = f"{step:02d}_"
    artifacts = [
        {"file": p.name, "bytes": p.stat().st_size}
        for p in sorted(root.rglob(f"{prefix}*"))
        if p.is_file()
    ]
    return {"run_id": claims.run_id, "step": step, "artifacts": artifacts}


#: The allowlist the protocol adapter exposes. Named here so adding a tool is a
#: visible diff in one place rather than a decorator someone slipped into a file.
READ_ONLY_TOOLS = ("repo.read_file", "repo.get_status", "project.get_step_artifacts")
