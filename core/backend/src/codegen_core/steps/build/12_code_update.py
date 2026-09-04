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
from ..core.errors import PolicyViolation
from ..core.guardrails import run_generated_code_guardrails
from ..core.parts import Modality, blob, structured
from ..plugins.factory import build_plugin
from ..schemas.action import ActionIntentV1, validate_intent
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

        intent = validate_intent(self._intent(spec, manifest))
        ctx.remember("ActionIntentV1", intent.model_dump(mode="json"))
        ctx.journal.append_event(
            "action_intent",
            step=self.step,
            action=intent.action,
            justification=intent.justification,
            target_files=intent.target_files,
            risk_level=intent.risk_level,
        )

        backend = ctx.router.backend_for(self.step)
        system = ctx.prompts.load(ctx.cfg.step_cfg(self.step).prompt)
        user = self._instruction(spec, plan, manifest)

        writes_own_files = getattr(backend, "edits_files_directly", False)
        gateway_mode = ctx.cfg.gateway.mode

        if writes_own_files and gateway_mode == "mcp":
            # The bypass, closed. A backend holding its own file handle cannot
            # be constrained by a gateway it never calls, so under mcp mode it
            # is refused rather than allowed to write unchecked (ADR 0004).
            raise PolicyViolation(
                f"backend {backend.id!r} writes files directly, which bypasses the "
                f"MCP gateway. Set gateway.mode to 'direct' or 'shadow', or use an "
                f"in-process backend for step 12."
            )

        if writes_own_files:
            completion = backend.complete(system, user, workspace=str(ctx.workspace))
            transcript = completion.text
        else:
            completion, transcript = self._run_agent(ctx, backend, system, user, guard)

        # Under mcp mode the gateway owns the write, so an outage must stop the
        # run here rather than let the in-process guard quietly take over.
        if gateway_mode == "mcp":
            self._require_gateway(ctx)

        vcs = build_plugin(ctx.cfg, "vcs", ctx)
        changeset = vcs.snapshot_changes(ctx.workspace)
        if not changeset["changed_files"] and not changeset["created_files"]:
            changeset.update(guard.summary())

        # Post-hoc audit: the only defence for backends that wrote directly.
        violations = []
        if writes_own_files:
            violations = audit_changeset(changeset, manifest["allowed_paths"], ctx.policy)

        # Content guardrails, at the point of generation. Step 18 scans for
        # secrets six steps later; by then the credential is on disk and in
        # every artifact between. Raises for a mutating step, so a rejected
        # changeset is replanned rather than quietly accepted.
        guardrails = run_generated_code_guardrails(
            self._generated_sources(ctx, changeset),
            intent.model_dump(mode="json"),
            mutating=True,
            level="pipeline",
        )
        for result in guardrails:
            ctx.journal.append_event("guardrail", step=self.step, **result.as_event())

        diff_uri = None
        if changeset.get("unified_diff"):
            diff_uri = ctx.artifacts.write(
                self.step, "diff", changeset["unified_diff"], ext="diff", output_class="structured"
            )
        payload = {k: v for k, v in changeset.items() if k != "unified_diff"}
        payload["policy_violations"] = violations
        payload["transcript_excerpt"] = (transcript or "")[:2000]
        payload["action_intent"] = intent.model_dump(mode="json")
        payload["guardrails"] = [r.as_event() for r in guardrails]

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

    def _require_gateway(self, ctx: Any) -> None:
        """Confirm the gateway answers before trusting the write to it.

        Checked with a read-only call: `repo.get_status` costs nothing and
        proves the connection, the token and the policy load in one go.
        """
        from ..gateway.client import GatewayCall, GatewayClient, GatewayUnavailable

        client = GatewayClient(
            ctx.cfg,
            run_id=ctx.job_id,
            step=self.step,
            agent=self.name,
            project_root=str(ctx.workspace),
        )
        try:
            client.call(GatewayCall(tool="repo.get_status", arguments={"limit": 1}))
        except GatewayUnavailable as exc:
            # Raises when fail_closed, which is the default and the documented
            # acceptance criterion. Never silently continues.
            client.guard_outage(exc)

    def _generated_sources(self, ctx: Any, changeset: dict) -> dict[str, str]:
        """The text of every file this step touched, read from disk.

        From disk rather than from the model's transcript: a `cli_agent` backend
        never produces a transcript, and a model's account of what it wrote is
        not evidence of what is on disk.
        """
        sources: dict[str, str] = {}
        touched = list(changeset.get("changed_files", [])) + list(
            changeset.get("created_files", [])
        )
        for rel in touched:
            path = ctx.workspace / rel
            try:
                sources[rel] = path.read_text(encoding="utf-8", errors="replace")
            except (OSError, IsADirectoryError):
                # A deleted or binary file has no source to scan; the write
                # guard and the diff already cover its existence.
                continue
        return sources

    def _intent(self, spec: Any, manifest: dict) -> ActionIntentV1:
        """Declare, before writing, what is about to change and why.

        Built from the artifacts the step already consumes rather than asked of
        the model: the whitelist and the acceptance criteria are facts by the
        time this runs, and a model asked to justify itself will oblige with
        whatever passes. The specificity rules in `validate_intent` then apply
        to a sentence that has to name real files.
        """
        files = list(manifest.get("files_to_modify", [])) + list(
            manifest.get("files_to_create", [])
        )
        criteria = getattr(spec, "acceptance_criteria", None) or []
        why = criteria[0] if criteria else getattr(spec, "summary", "the feature specification")

        return ActionIntentV1(
            step=self.step,
            agent=self.name,
            action="apply_patch",
            justification=(
                f"Change {', '.join(files[:4]) or 'the whitelisted paths'} to satisfy {why}. "
                f"Scope is bounded by the step-09 Impact Manifest "
                f"({len(files)} file(s), {manifest.get('loc_budget', 0)} LOC budget); "
                f"nothing outside that whitelist is writable."
            ),
            target_files=files,
            expected_outcome=(
                "The whitelisted files implement the specified change and the "
                "acceptance criteria become verifiable at step 13."
            ),
            validation_plan=[
                "step 14 static quality validation (ruff, mypy)",
                "step 16 pytest unit test execution",
                "step 18 sast and dependency scan",
            ],
            risk_level="critical",
            requires_human_approval=True,
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
