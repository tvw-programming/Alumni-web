"""Artifact store: strict naming, extension rules, checksums, immutability.

Naming:  NN_<slug>[__<variant>]__<JOB_ID>__v<K>.<ext>
Rules come from config.artifacts.extension_rules and are enforced on write, so a
step cannot quietly save a .txt where the convention says .json.

Layout:  <artifacts root>/<job id>/<JIRA-ID>-<first 15 chars of the title>/
Everything one run writes — the JSON, the markdown, the rendered PDF or DOCX —
lands in one folder named after the story it came from, so a reader can find a
run's output without consulting the index first. The story folder is bound once
step 01 knows the title; anything written before that stays at the job root.

Supersession: artifacts are immutable, so nothing is ever overwritten. A newer
artifact may instead declare which files it *replaces*, and readers that want
"the document as it stands now" ask for the live set. The superseded bytes stay
on disk and in the index, because an auditor has to be able to see what the run
used to think as well as what it thinks now.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from .errors import ArtifactError

OutputClass = Literal["structured", "document", "error_snapshot", "specification"]

CLASS_BY_EXT = {
    "json": "structured",
    "pdf": "document",
    "docx": "document",
    "doc": "document",
    "jpg": "error_snapshot",
    "jpeg": "error_snapshot",
    "md": "specification",
    "diff": "structured",
}

MIME_BY_EXT = {
    "json": "application/json",
    "md": "text/markdown",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "diff": "text/x-diff",
}


#: Names Windows refuses regardless of extension, case-insensitively.
WINDOWS_RESERVED = {
    "con", "prn", "aux", "nul",
    *(f"com{n}" for n in range(1, 10)),
    *(f"lpt{n}" for n in range(1, 10)),
}

#: How much of the story title goes into the folder name.
TITLE_CHARS = 15


def safe_folder_name(jira_id: str, title: str) -> str:
    """`DEEP-2041` + `Implement user profile…` -> `DEEP-2041-implement-user`.

    The result has to be a legal directory name on macOS, Linux and Windows, so
    everything outside [A-Za-z0-9._-] becomes a hyphen, runs collapse, and the
    Windows device names are prefixed rather than used bare. An empty or
    unusable title leaves the Jira id standing on its own.
    """
    head = re.sub(r"[^A-Za-z0-9._-]+", "-", (jira_id or "").strip()).strip("-._")
    tail = re.sub(r"[^A-Za-z0-9]+", "-", (title or "")[:TITLE_CHARS].strip().lower()).strip("-")
    name = "-".join(part for part in (head, tail) if part) or "untitled"
    # Windows rejects trailing dots and spaces, and the device names above.
    name = name.rstrip(". ")
    if name.split(".")[0].lower() in WINDOWS_RESERVED:
        name = f"_{name}"
    return name


class ArtifactStore:
    def __init__(self, cfg: Any, job_id: str) -> None:
        self.cfg = cfg
        self.job_id = job_id
        self.root = Path(cfg.app.paths.artifacts.format(job_id=job_id))
        self.root.mkdir(parents=True, exist_ok=True)
        self.index_path = self.root / cfg.artifacts.index_file
        if not self.index_path.exists():
            self.index_path.write_text("[]")
        #: Folder new artifacts go into, relative to root. Empty until bound.
        self.story_dir: str = self._story_dir_from_index()

    # ------------------------------------------------------------------ #
    def bind_story(self, jira_id: str, title: str) -> Path:
        """Point new writes at this story's folder, creating it.

        Called by step 01 once the ticket is in hand, before it writes anything,
        so the whole run lands in one place. Re-binding with the same story is a
        no-op, which keeps a resumed run writing where it was.
        """
        self.story_dir = safe_folder_name(jira_id, title)
        target = self.root / self.story_dir
        target.mkdir(parents=True, exist_ok=True)
        return target

    def _story_dir_from_index(self) -> str:
        """Resume into the folder the run was already using."""
        try:
            for entry in reversed(self.index()):
                if entry.get("dir"):
                    return str(entry["dir"])
        except (OSError, json.JSONDecodeError):
            return ""
        return ""

    @property
    def write_dir(self) -> Path:
        return self.root / self.story_dir if self.story_dir else self.root

    # ------------------------------------------------------------------ #
    def _check_extension(self, ext: str, output_class: OutputClass) -> None:
        allowed = self.cfg.artifacts.extension_rules.get(output_class)
        allowed = [allowed] if isinstance(allowed, str) else list(allowed or [])
        if ext not in allowed:
            raise ArtifactError(
                f"output class '{output_class}' must use one of {allowed}, got '.{ext}'"
            )

    def _next_version(self, step: int, slug: str, variant: str | None, ext: str) -> int:
        """Versions are per extension: the .md and .pdf of one document are both v1.

        The search spans the story folder as well as the job root, so a run that
        wrote before the story was bound cannot hand out the same version twice.
        """
        stem = f"{step:02d}_{slug}" + (f"__{variant}" if variant else "")
        pattern = f"{stem}__{self.job_id}__v*.{ext}"
        existing = set(self.root.glob(pattern)) | set(self.root.glob(f"*/{pattern}"))
        return len(existing) + 1

    def name_for(self, step: int, slug: str, ext: str, variant: str | None = None) -> str:
        version = self._next_version(step, slug, variant, ext)
        suffix = self.cfg.artifacts.variant_suffix_template.format(variant=variant) if variant else ""
        return self.cfg.artifacts.naming_template.format(
            step=step, slug=slug, variant_suffix=suffix,
            job_id=self.job_id, version=version, ext=ext,
        )

    # ------------------------------------------------------------------ #
    def write(
        self,
        step: int,
        slug: str,
        payload: bytes | str | dict,
        *,
        ext: str,
        output_class: OutputClass | None = None,
        variant: str | None = None,
        supersedes: list[str] | None = None,
        source: str | None = None,
    ) -> str:
        """Persist an artifact and return its artifact:// URI.

        `supersedes` names artifacts this one replaces — used when a human hands
        the run a document instead of the model's. `source` records who produced
        it ("pipeline" unless stated), so provenance survives in the index.
        """
        ext = ext.lstrip(".").lower()
        oc = output_class or CLASS_BY_EXT.get(ext)
        if oc is None:
            raise ArtifactError(f"unknown extension '.{ext}' - no output class mapping")
        self._check_extension(ext, oc)  # type: ignore[arg-type]

        if isinstance(payload, dict):
            raw = json.dumps(payload, indent=2, default=str).encode()
        elif isinstance(payload, str):
            raw = payload.encode()
        else:
            raw = payload

        filename = self.name_for(step, slug, ext, variant)
        path = self.write_dir / filename
        if path.exists() and self.cfg.artifacts.immutable:
            raise ArtifactError(f"artifact already exists and store is immutable: {filename}")
        path.write_bytes(raw)

        digest = hashlib.new(self.cfg.artifacts.checksum_algorithm, raw).hexdigest()
        self._append_index(
            {
                "step": step, "slug": slug, "variant": variant, "file": filename,
                # Where the file sits relative to the job root. Readers resolve
                # through the index rather than assuming a flat directory.
                "dir": self.story_dir,
                "ext": ext, "output_class": oc, "bytes": len(raw),
                "sha256": digest, "written_at": datetime.now(UTC).isoformat(),
                "source": source or "pipeline",
                "supersedes": [str(u).rsplit("/", 1)[-1] for u in supersedes or []],
            }
        )
        return f"artifact://{self.job_id}/{filename}"

    def record_existing(self, entry: dict) -> None:
        """Index a file this job did not write — a cached step's output.

        The checksum comes with the entry rather than being recomputed, because
        it is the checksum the previous run took and the whole point of reusing
        the artifact is that it is the same bytes. Anything already indexed is
        left alone, so a replay cannot double-count.
        """
        if any(e["file"] == entry["file"] for e in self.index()):
            return
        self._append_index({
            "step": entry["step"], "slug": entry.get("slug", ""),
            "variant": entry.get("variant"), "file": entry["file"],
            "dir": entry.get("dir", ""), "ext": entry["ext"],
            "output_class": entry["output_class"], "bytes": entry["bytes"],
            "sha256": entry["sha256"], "written_at": datetime.now(UTC).isoformat(),
            "source": entry.get("source", "pipeline"), "supersedes": [],
            **({"cached_from": entry["cached_from"]} if entry.get("cached_from") else {}),
        })

    def write_document(self, step: int, slug: str, markdown: str, formats: list[str]) -> list[str]:
        """Write the .md source plus any requested rendered formats."""
        from ..tools.doc_render import render

        uris = [self.write(step, slug, markdown, ext="md", output_class="specification")]
        for fmt in formats:
            data = render(markdown, fmt)
            uris.append(self.write(step, slug, data, ext=fmt, output_class="document"))
        return uris

    # ------------------------------------------------------------------ #
    def local_path(self, uri: str) -> Path:
        """Resolve an artifact:// URI, or a bare filename, to a path on disk.

        The index is the authority: it records the folder each file went into,
        so nothing outside this class needs to know the layout. Files written
        before the story folder existed still resolve, and so do runs whose
        index predates the `dir` field.
        """
        name = uri.rsplit("/", 1)[-1]
        for entry in self.index():
            if entry["file"] == name:
                return self.root / entry.get("dir", "") / name
        candidate = self.write_dir / name
        return candidate if candidate.exists() else self.root / name

    def read_bytes(self, uri: str) -> bytes:
        return self.local_path(uri).read_bytes()

    def read_text(self, uri: str) -> str:
        return self.local_path(uri).read_text()

    def read_json(self, uri: str) -> Any:
        return json.loads(self.read_text(uri))

    def superseded(self) -> set[str]:
        """Filenames some later artifact declared it replaces."""
        return {
            name
            for entry in self.index()
            for name in entry.get("supersedes") or []
        }

    def live_index(self) -> list[dict]:
        """The index with replaced artifacts filtered out — the run as it stands."""
        dead = self.superseded()
        return [e for e in self.index() if e["file"] not in dead]

    def of_step(self, step: int, *, include_superseded: bool = False) -> list[str]:
        """Artifact URIs for one step, current ones only unless asked otherwise.

        Gates open against this, so a replaced BRD must not come back: a gate
        that re-opened against a superseded document would ask a human to sign
        bytes the run no longer uses.
        """
        entries = self.index() if include_superseded else self.live_index()
        return [
            f"artifact://{self.job_id}/{e['file']}"
            for e in entries
            if e["step"] == step
        ]

    def latest_of_step(self, step: int, ext: str) -> str | None:
        """The newest live artifact of one extension, or None."""
        for entry in reversed(self.live_index()):
            if entry["step"] == step and entry["ext"] == ext:
                return f"artifact://{self.job_id}/{entry['file']}"
        return None

    def sha_of(self, uri: str) -> str | None:
        name = uri.rsplit("/", 1)[-1]
        for e in self.index():
            if e["file"] == name:
                return e["sha256"]
        return None

    def index(self) -> list[dict]:
        return json.loads(self.index_path.read_text())

    def _append_index(self, entry: dict) -> None:
        data = self.index()
        data.append(entry)
        self.index_path.write_text(json.dumps(data, indent=2))

    def purge_workspace(self, workspace: Path) -> None:
        if workspace.exists():
            shutil.rmtree(workspace, ignore_errors=True)
