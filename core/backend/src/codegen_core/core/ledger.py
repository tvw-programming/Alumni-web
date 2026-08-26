"""What has already been produced for a story, across runs.

Every `codegen-core run` mints a new job id, so a second run of DEEP-2042 shares
nothing with the first: it regenerates the same analysis, the same context spec
and the same BRD from the same ticket, and pays for all of it again. The journal
already stops a *resumed* run repeating itself; nothing stopped a new one.

The ledger is that memory, kept per story rather than per job. Before a step
runs, its inputs are hashed; if the same story produced the same step from the
same inputs before, the artifacts are copied into this run and the step is
skipped. What makes it safe is the key:

    JIRA number + step + sha256(the payloads this step consumes)

Inputs, not just the step number. When a reviewer replaces the BRD at gate 06,
step 07's inputs change, its key changes, and it regenerates against the new
document — a story-number-only cache would have served test designs built from
the BRD that was rejected.

Two things are never cached. Gates 06 and 24 always execute and always wait for
a human: replaying a stored approval would let a decision someone took last week
stand in for a document they have not seen, which is the one thing config is not
allowed to do either. And a step a human explicitly retries runs for real — a
cache hit is exactly what a person pressing Retry is not asking for.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .telemetry import log

#: Directory name under the artifacts root; leading underscore keeps it out of
#: the way of job directories, which are named after job ids.
LEDGER_DIR = "_ledger"


def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-.") or "unknown"


def input_fingerprint(consumes: list[str], store: dict[str, Any], extra: Any = None) -> str:
    """A stable hash of everything a step is about to be handed.

    Missing inputs are recorded as such rather than skipped, so "step 07 ran
    before its producer existed" and "step 07 ran with a real BRD" cannot
    collide on the same key.
    """
    payload = {
        schema_id: store.get(schema_id, {"_absent": True})
        for schema_id in sorted(consumes)
    }
    if extra is not None:
        payload["_extra"] = extra
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode()
    ).hexdigest()


class StoryLedger:
    """Per-story record of which steps have been produced, and from what."""

    def __init__(self, cfg: Any, jira_id: str) -> None:
        self.cfg = cfg
        self.jira_id = jira_id
        #: The artifacts template ends in {job_id}; a probe gives its parent.
        root = Path(cfg.app.paths.artifacts.format(job_id="__probe__")).parent
        self.dir = root / LEDGER_DIR
        self.path = self.dir / f"{_safe(jira_id)}.json"

    # ------------------------------------------------------------------ #
    def _read(self) -> dict:
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text())
        except (OSError, json.JSONDecodeError):
            # A corrupt ledger costs tokens, never correctness: the run simply
            # regenerates everything, which is what it did before this existed.
            log.warning("ledger unreadable, ignoring", extra={"extra_fields": {"story": self.jira_id}})
            return {}

    def _write(self, data: dict) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, indent=2, default=str))

    # ------------------------------------------------------------------ #
    def lookup(self, step: int, fingerprint: str) -> dict | None:
        """The recorded output for this step, if it was made from these inputs."""
        entry = self._read().get(str(step))
        if entry is None or entry.get("input_sha") != fingerprint:
            return None
        return entry

    def record(
        self, ctx: Any, step: int, fingerprint: str, schemas: list[str], payload: Any = None
    ) -> None:
        """Remember what this step produced, keyed to the inputs that made it.

        The typed payload is stored alongside the artifact list rather than being
        read back out of them later. Not every step writes its payload as JSON —
        several write a markdown specification — and a cached step that cannot
        hand its payload to the next step is worse than no cache at all: the
        next step then runs with a hole where its input should be.
        """
        artifacts = [
            {k: e.get(k) for k in
             ("step", "slug", "variant", "file", "dir", "ext", "output_class", "bytes", "sha256")}
            for e in ctx.artifacts.live_index()
            if e["step"] == step
        ]
        if not artifacts:
            return
        data = self._read()
        data[str(step)] = {
            "input_sha": fingerprint,
            "schemas": list(schemas),
            "payload": payload,
            "artifacts": artifacts,
            "job_id": ctx.job_id,
            "at": datetime.now(UTC).isoformat(),
        }
        self._write(data)

    def forget(self, steps: list[int]) -> None:
        """Drop cached steps — used when something invalidates them wholesale."""
        data = self._read()
        for step in steps:
            data.pop(str(step), None)
        self._write(data)

    # ------------------------------------------------------------------ #
    def replay(self, ctx: Any, entry: dict) -> list[str]:
        """Copy a previous run's artifacts into this job, and return their URIs.

        Copied rather than referenced: a run has to be readable on its own. The
        dashboard, the artifact endpoint and any auditor all resolve through
        this job's index, and none of them should have to know that some bytes
        live under a job id from last Tuesday.
        """
        source_root = Path(self.cfg.app.paths.artifacts.format(job_id=entry["job_id"]))
        uris = []
        for item in entry["artifacts"]:
            src = source_root / item.get("dir", "") / item["file"]
            if not src.is_file():
                raise FileNotFoundError(src)
            dest_dir = ctx.artifacts.root / (ctx.artifacts.story_dir or "")
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / item["file"]
            if not dest.exists():
                shutil.copy2(src, dest)
            ctx.artifacts.record_existing(
                {**item, "dir": ctx.artifacts.story_dir, "source": "cache",
                 "cached_from": entry["job_id"]}
            )
            uris.append(f"artifact://{ctx.job_id}/{item['file']}")
        return uris
