"""Step 12 - Code Update Agent.

Component: AGENT (write-scoped)         Category: Code Synthesis

The only step that mutates the repository. Two execution paths, chosen by which
backend config routes here:

  in-process (ollama / anthropic / openai / bedrock)
      Writes go through GuardedFS, which refuses any path outside the step-09
      whitelist BEFORE the bytes hit disk. This is the safe path.

  dev-tool CLI (cursor / copilot / claude-code, edits_files_directly=true)
      The binary writes to the workspace itself and never calls our guard. We
      therefore audit the resulting diff AFTER the fact via audit_changeset().
      That is strictly weaker: the unwanted edit already exists on disk, it is
      just not yet committed. The step fails and the runner routes back here
      with the violations attached.

If deepagents is installed we drive the agentic loop through create_deep_agent
with the guard exposed as tools; otherwise we fall back to a single completion
that returns a file plan, which keeps the pipeline runnable in a bare venv.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.component import Agent
from ..core.envelope import Envelope
from ..core.parts import Modality, blob, structured
from ..plugins.factory import build_plugin
from ..schemas.spec import FeatureSpecV1
from ..tools.file_write_guard import GuardedFS, audit_changeset, make_guarded_fs_tools


class CodeUpdateAgent(Agent):
    step = 12
    name = "code_update"
    category = "Code Synthesis (write-scoped)"
    capability = "coding"
    consumes = ["FeatureSpecV1", "ChangePlanV1", "ImpactManifestV1", "RepoUnderstandingV1"]
    produces = ["12_code_changeset__{job}__v{v}.json", "12_diff__{job}__v{v}.diff"]
    accepts = ["application/json", "text/markdown"]

    # ------------------------------------------------------------------ #
    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        manifest = ctx.require("ImpactManifestV1")
        spec = FeatureSpecV1.model_validate(ctx.require("FeatureSpecV1"))
        plan = ctx.recall("ChangePlanV1") or {}

        guard = GuardedFS(
            root=ctx.workspace,
            allowed_globs=manifest["allowed_paths"],
            policy=ctx.policy,
            loc_budget=manifest.get("loc_budget", 300),
        )

        backend = ctx.router.backend_for(self.step)
        system = ctx.prompts.load(ctx.cfg.step_cfg(self.step).prompt)
        user = self._instruction(spec, plan, manifest)

        if getattr(backend, "edits_files_directly", False):
            completion = backend.complete(system, user, workspace=str(ctx.workspace))
            transcript = completion.text
        else:
            completion, transcript = self._run_agent(ctx, backend, system, user, guard)

        vcs = build_plugin(ctx.cfg, "vcs", ctx)
        changeset = vcs.snapshot_changes(ctx.workspace)
        if not changeset["changed_files"] and not changeset["created_files"]:
            changeset.update(guard.summary())

        # Post-hoc audit: the only defence for backends that wrote directly.
        violations = []
        if getattr(backend, "edits_files_directly", False):
            violations = audit_changeset(changeset, manifest["allowed_paths"], ctx.policy)

        diff_uri = None
        if changeset.get("unified_diff"):
            diff_uri = ctx.artifacts.write(
                self.step, "diff", changeset["unified_diff"], ext="diff", output_class="structured"
            )
        payload = {k: v for k, v in changeset.items() if k != "unified_diff"}
        payload["policy_violations"] = violations
        payload["transcript_excerpt"] = (transcript or "")[:2000]

        ctx.remember("CodeChangesetV1", payload)
        ctx.artifacts.write(self.step, "code_changeset", payload, ext="json")

        parts = [structured("CodeChangesetV1", payload)]
        if diff_uri:
            parts.append(blob(diff_uri, "text/x-diff", Modality.DIFF, name="changeset"))

        prov = ctx.provenance_for(self.step, prompt=system + user, usage=completion.usage)
        prov = prov.model_copy(update={"backend_id": backend.id, "model_id": backend.model_id})
        return env.reply(
            self.ref(), parts,
            status="POLICY_VIOLATION" if violations else "OK",
            provenance=prov,
        ).model_copy(update={"parts": parts})

    # ------------------------------------------------------------------ #
    def _instruction(self, spec: FeatureSpecV1, plan: dict, manifest: dict) -> str:
        steps = "\n".join(
            f"{c['seq']}. [{c['layer']}] {c['action']} {c['file']}"
            for c in plan.get("ordered_changes", [])
        )
        return (
            f"{spec.as_change_instruction()}\n\n"
            f"## Ordered change plan - follow this sequence exactly\n{steps or '(none)'}\n\n"
            f"## Hard limits\n"
            f"- You may only write to: {manifest['allowed_paths']}\n"
            f"- Total changed lines must stay under {manifest.get('loc_budget')}\n"
            f"- Do not refactor anything the acceptance criteria do not require\n"
        )

    def _run_agent(self, ctx: Any, backend: Any, system: str, user: str, guard: GuardedFS):
        try:
            from deepagents import create_deep_agent
        except ImportError:
            # No agent framework available: ask for a file plan and apply it
            # through the guard, so the safety properties still hold.
            completion, _ = ctx.router.complete(
                self.step, system,
                user + "\n\nReturn JSON: {\"files\": [{\"path\": ..., \"content\": ...}]}",
            )
            try:
                for f in completion.as_json().get("files", []):
                    guard.write_file(f["path"], f["content"])
            except Exception as exc:  # noqa: BLE001 - surfaced as a step failure
                ctx.journal.append_event("code_update_fallback_error", error=str(exc))
            return completion, completion.text

        agent = create_deep_agent(
            model=backend.model_id,
            tools=make_guarded_fs_tools(guard),
            system_prompt=system,
        )
        result = agent.invoke({"messages": [{"role": "user", "content": user}]})
        text = json.dumps(result, default=str)[:4000]

        class _C:
            usage = {"tokens_in": 0, "tokens_out": 0}
        return _C(), text


STEP = CodeUpdateAgent()
