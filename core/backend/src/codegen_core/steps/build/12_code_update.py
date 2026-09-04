"""Step 12 - Code Update Agent.

Component: AGENT (write-scoped)         Category: Code Synthesis

The only step that mutates the repository. Paths are split under
`codegen_core.steps.step12`:

  run_agent_fix   — in-process LLM + GuardedFS (production write path)
  run_cli_audit    — local-only CLI backends; refused in prod
  run_gateway_patch — declared writes via MCP gateway mutations

See `step12/router.py` for dispatch, loop-budget enforcement, and prior-failure
prompt injection.
"""

from __future__ import annotations

from typing import Any

from ..core.component import Agent
from ..core.envelope import Envelope
from .step12.router import dispatch_code_update


class CodeUpdateAgent(Agent):
    step = 12
    name = "code_update"
    category = "Code Synthesis (write-scoped)"
    capability = "coding"
    consumes = ["FeatureSpecV1", "ChangePlanV1", "ImpactManifestV1", "RepoUnderstandingV1"]
    produces = ["12_code_changeset__{job}__v{v}.json", "12_diff__{job}__v{v}.diff"]
    accepts = ["application/json", "text/markdown"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        return dispatch_code_update(self, env, ctx)


STEP = CodeUpdateAgent()
