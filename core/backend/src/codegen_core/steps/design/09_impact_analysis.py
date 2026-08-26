"""Step 09 - Impact Analysis / Identify Files to Change.

Component: AGENT                Category: Change Scoping / Whitelisting

The most safety-critical artifact in the pipeline. `allowed_paths` becomes the
write whitelist that GuardedFS enforces at step 12; `loc_budget` becomes the
change cap. Everything the code agent is allowed to do is decided here, by a
model that has not yet seen any code it wants to write.

post_process() derives allowed_paths from the concrete file lists when the model
leaves it empty, so the whitelist can never be accidentally unbounded.
"""

from __future__ import annotations

from pathlib import PurePosixPath
from typing import Any

from ._base import JsonAgentStep


class ImpactAnalysis(JsonAgentStep):
    step = 9
    name = "impact_analysis"
    category = "Change Scoping / Whitelisting"
    capability = "coding"
    consumes = ["BrdV1", "RepoUnderstandingV1", "StoryAnalysisV1", "TestDesignV1"]
    emits = "ImpactManifestV1"
    slug = "impact_manifest"
    produces = ["09_impact_manifest__{job}__v{v}.json"]
    accepts = ["application/json"]

    def post_process(self, payload: dict, ctx: Any) -> dict:
        files = list(payload.get("files_to_modify", [])) + list(payload.get("files_to_create", []))
        if not payload.get("allowed_paths"):
            # Derive the narrowest whitelist that still covers the named files.
            payload["allowed_paths"] = sorted(
                {f"{PurePosixPath(f).parent.as_posix()}/*" for f in files if f}
            ) or ["__nothing__"]
        cap = ctx.cfg.policy.write_scope.max_changed_loc
        payload["loc_budget"] = min(int(payload.get("loc_budget") or cap), cap)
        ctx.impact_manifest = payload
        return payload

    def rehydrate(self, payload: dict, ctx: Any) -> None:
        """The manifest is the write whitelist, and it lives on the context.

        Steps 12 onwards refuse to run without it, so a process that did not
        execute this step — a resume after the gate, a retry of step 13, a run
        that found this step already done for the story — has to be handed it
        back from the artifact or it fails a precondition it genuinely meets.
        """
        ctx.impact_manifest = payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        return "OK" if payload.get("allowed_paths") != ["__nothing__"] else "FAILED"


STEP = ImpactAnalysis()
