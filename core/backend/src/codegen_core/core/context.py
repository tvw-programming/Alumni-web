"""JobContext - everything a step needs, assembled once per run.

Steps never construct their own config, router, or store. They receive a
JobContext and read from it. This keeps steps testable (inject a fake context)
and keeps provenance consistent (one place builds it).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .artifacts import ArtifactStore
from .config import AppConfig
from .envelope import ComponentRef, new_id
from .journal import Journal
from .policy import PolicyEngine
from .prompts import PromptLibrary
from .provenance import Provenance
from .telemetry import Telemetry


@dataclass
class JobContext:
    cfg: AppConfig
    job_id: str
    jira_id: str
    artifacts: ArtifactStore
    journal: Journal
    policy: PolicyEngine
    prompts: PromptLibrary
    telemetry: Telemetry
    router: Any = None
    plugins: dict[str, Any] = field(default_factory=dict)
    workspace: Path = Path(".")
    #: populated once step 09 runs; step 12+ refuse to run without it
    impact_manifest: dict | None = None
    #: set true only after a human signs off on schema changes
    migration_approved: bool = False
    #: cheap cross-step scratch space for typed artifacts already produced
    store: dict[str, dict] = field(default_factory=dict)

    # ------------------------------------------------------------------ #
    @classmethod
    def create(cls, cfg: AppConfig, jira_id: str, job_id: str | None = None) -> "JobContext":
        if job_id is None:
            # DEEP-1042 already carries the prefix; don't produce DEEP-DEEP-1042.
            stem = jira_id if jira_id.startswith(f"{cfg.app.job_id_prefix}-") else f"{cfg.app.job_id_prefix}-{jira_id}"
            job_id = f"{stem}-{uuid.uuid4().hex[:6]}"
        artifacts = ArtifactStore(cfg, job_id)
        journal = Journal(cfg, job_id)
        # The project the story is implemented against: app.project.path when
        # configured, otherwise the workspace path. Validating here means a bad
        # path is reported before step 01 rather than at step 12.
        workspace = cfg.validate_project_path(job_id)
        workspace.mkdir(parents=True, exist_ok=True)
        ctx = cls(
            cfg=cfg,
            job_id=job_id,
            jira_id=jira_id,
            artifacts=artifacts,
            journal=journal,
            policy=PolicyEngine(cfg, journal),
            prompts=PromptLibrary(cfg.app.paths.prompts, cfg.secrets.redaction.patterns),
            telemetry=Telemetry(cfg, journal),
            workspace=workspace,
        )
        return ctx

    # ------------------------------------------------------------------ #
    def new_id(self, prefix: str = "msg") -> str:
        return new_id(prefix)

    def orchestrator_ref(self) -> ComponentRef:
        return ComponentRef(step=None, name="orchestrator", kind="RUNNER")

    def remember(self, schema_id: str, data: dict) -> None:
        """Cache a typed artifact so later steps can read it without re-parsing."""
        self.store[schema_id] = data

    def recall(self, schema_id: str) -> dict | None:
        return self.store.get(schema_id)

    def require(self, schema_id: str) -> dict:
        data = self.store.get(schema_id)
        if data is None:
            raise KeyError(f"{schema_id} has not been produced yet in job {self.job_id}")
        return data

    def provenance_for(self, step: int, prompt: str = "", usage: dict | None = None) -> Provenance:
        backend = self.router.backend_for(step) if self.router else None
        prov = Provenance(
            backend_id=getattr(backend, "id", None),
            model_id=getattr(backend, "model_id", None),
            prompt_sha256=Provenance.hash_prompt(prompt) if prompt else None,
        )
        if usage and backend is not None:
            prov = prov.with_usage(
                usage.get("tokens_in", 0), usage.get("tokens_out", 0), backend.cfg.cost_per_1k_usd
            )
        return prov
