"""Step 15 - Unit Test Generation / Final Synchronization.

Component: AGENT                Category: Test Reconciliation

Step 07 designed tests from requirements before code existed. This step turns
those designs into executable test code against the implementation that actually
got written.

The distinction is the whole point: step 07 is intent, step 15 is mechanics. If
a design cannot be expressed against the real code, that is a signal the code is
wrong - not a licence to change the test's intent. Such cases are reported in
`unimplementable` rather than silently dropped.
"""

from __future__ import annotations

from typing import Any

from ..core.envelope import Envelope
from ..tools.file_write_guard import GuardedFS
from ._base import JsonAgentStep


class UnitTestSynchronization(JsonAgentStep):
    step = 15
    name = "unit_test_synchronization"
    category = "Test Reconciliation"
    capability = "coding"
    consumes = ["TestDesignV1", "CodeChangesetV1", "FeatureSpecV1", "ImpactManifestV1"]
    emits = "TestSyncV1"
    slug = "test_sync"
    produces = ["15_test_sync__{job}__v{v}.json"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        manifest = ctx.require("ImpactManifestV1")
        guard = GuardedFS(
            root=ctx.workspace,
            allowed_globs=[p for p in manifest["allowed_paths"] if "test" in p.lower()]
                          or manifest["allowed_paths"],
            policy=ctx.policy,
            loc_budget=manifest.get("loc_budget", 300),
        )
        ctx.store["_test_guard"] = guard  # exposed for post_process
        return super().handle(env, ctx)

    def post_process(self, payload: dict, ctx: Any) -> dict:
        guard: GuardedFS | None = ctx.store.get("_test_guard")
        for f in payload.get("files", []) or []:
            if guard and f.get("path") and f.get("content"):
                guard.write_file(f["path"], f["content"])
        payload.setdefault("unimplementable", [])
        payload.pop("files", None)
        return payload


STEP = UnitTestSynchronization()
