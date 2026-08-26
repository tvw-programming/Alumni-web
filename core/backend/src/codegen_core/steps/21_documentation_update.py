"""Step 21 - General Documentation Update.

Component: AGENT                Category: Docs Synchronisation

README, OpenAPI, developer docs, configuration notes. Runs after the TDD so it
can reuse those decisions rather than re-deriving them.

Writes go through GuardedFS with a docs-only whitelist: a documentation step that
can edit source code is a documentation step that will eventually edit source
code.
"""

from __future__ import annotations

from typing import Any

from ..core.envelope import Envelope
from ..tools.file_write_guard import GuardedFS
from ._base import JsonAgentStep

DOC_GLOBS = ["*.md", "docs/*", "docs/**/*", "README*", "openapi.*", "*.openapi.yaml"]


class DocumentationUpdate(JsonAgentStep):
    step = 21
    name = "documentation_update"
    category = "Docs Synchronisation"
    capability = "coding"
    consumes = ["TechnicalDesignV1", "FeatureSpecV1", "CodeChangesetV1"]
    emits = "DocUpdateV1"
    slug = "doc_updates"
    produces = ["21_doc_updates__{job}__v{v}.json"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        manifest = ctx.recall("ImpactManifestV1") or {}
        allowed = sorted(set(DOC_GLOBS) | {p for p in manifest.get("allowed_paths", [])
                                           if p.endswith(".md") or "doc" in p.lower()})
        ctx.store["_doc_guard"] = GuardedFS(ctx.workspace, allowed, ctx.policy, loc_budget=2000)
        return super().handle(env, ctx)

    def post_process(self, payload: dict, ctx: Any) -> dict:
        guard: GuardedFS | None = ctx.store.get("_doc_guard")
        written = []
        for f in payload.get("files", []) or []:
            if guard and f.get("path") and f.get("content"):
                guard.write_file(f["path"], f["content"])
                written.append(f["path"])
        payload.pop("files", None)
        payload["changed"] = sorted(set(payload.get("changed", []) + written))
        return payload


STEP = DocumentationUpdate()
