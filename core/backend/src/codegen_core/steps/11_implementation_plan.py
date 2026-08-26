"""Step 11 - Implementation Plan / Change Plan.

Component: AGENT                Category: Ordered Change Planning

Converts the spec into a sequence: schema -> repository -> service -> api -> ui
-> tests. Without it an agent edits files in whatever order it thought of them,
which produces diffs that are impossible to review and half-finished states that
break the build midway.

post_process() enforces the layer ordering deterministically rather than trusting
the model to sort correctly.
"""

from __future__ import annotations

from typing import Any

from ._base import JsonAgentStep

LAYER_ORDER = ["schema", "migration", "repository", "service", "api", "ui", "tests", "docs"]


class ImplementationPlan(JsonAgentStep):
    step = 11
    name = "implementation_plan"
    category = "Ordered Change Planning"
    capability = "coding"
    consumes = ["FeatureSpecV1", "ImpactManifestV1"]
    emits = "ChangePlanV1"
    slug = "change_plan"
    produces = ["11_change_plan__{job}__v{v}.json"]
    accepts = ["application/json"]

    def post_process(self, payload: dict, ctx: Any) -> dict:
        changes = payload.get("ordered_changes", [])
        changes.sort(key=lambda c: (LAYER_ORDER.index(c["layer"])
                                    if c.get("layer") in LAYER_ORDER else 99, c.get("seq", 0)))
        for i, c in enumerate(changes, 1):
            c["seq"] = i
        payload["ordered_changes"] = changes
        return payload


STEP = ImplementationPlan()
