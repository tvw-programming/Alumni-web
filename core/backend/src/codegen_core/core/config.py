"""Typed loader for config/config.json.

Everything that varies between environments lives in that one file. This module
turns it into a validated, immutable object graph and refuses to boot if the
configuration would violate a safety invariant.

Load order:  raw JSON -> profile overlay (deep merge) -> ${env:...} interpolation
             -> pydantic validation -> invariant assertions.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .errors import ConfigError

ENV_RE = re.compile(r"\$\{env:([A-Z0-9_]+)(?::-(.*?))?\}")

# Steps that exist to put a human in the loop. Nothing in config.json may switch
# these off; the check lives here, in Python, where a JSON edit cannot reach it.
MANDATORY_GATES = ("06", "24")

SECRET_LITERALS = (
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._\-]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def interpolate(node: Any) -> Any:
    """Replace ${env:VAR} / ${env:VAR:-default} with environment values."""
    if isinstance(node, str):

        def sub(m: re.Match[str]) -> str:
            val = os.getenv(m.group(1), m.group(2))
            if val is None:
                raise ConfigError(f"required env var {m.group(1)} is unset")
            return val

        return ENV_RE.sub(sub, node)
    if isinstance(node, dict):
        return {k: interpolate(v) for k, v in node.items()}
    if isinstance(node, list):
        return [interpolate(v) for v in node]
    return node


def deep_merge(base: dict, overlay: dict) -> dict:
    """Overlay wins; nested dicts merge rather than replace."""
    out = dict(base)
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="allow")


# --------------------------------------------------------------------------- #
# sections
# --------------------------------------------------------------------------- #
class Paths(Frozen):
    artifacts: str = "./artifacts/{job_id}"
    runs: str = "./runs/{job_id}"
    workspace: str = "./workspace/{job_id}"
    prompts: str = "./config/prompts"
    schema_registry: str = "./config/schemas"


class Concurrency(Frozen):
    max_parallel_steps: int = 1
    max_parallel_llm_calls: int = 2


class ProjectCfg(Frozen):
    """The checkout a story is implemented against.

    `path` is where the pipeline reads and writes code: the repository the Jira
    story describes a change to. Absolute is recommended; a relative path is
    resolved against the process working directory, and `{job_id}` is
    substituted if present. Leaving it empty keeps the historical behaviour of
    using `app.paths.workspace`.

    With `must_exist` on — the default — a missing or unusable path fails at
    boot, because every step from 04 onwards would otherwise fail later and less
    clearly.
    """

    path: str = ""
    must_exist: bool = True
    #: Refuse a path the pipeline cannot write to. Steps 12, 15 and 21 edit here.
    must_be_writable: bool = True


class AppSection(Frozen):
    job_id_prefix: str = "DEEP"
    paths: Paths = Paths()
    project: ProjectCfg = ProjectCfg()
    retention_days: dict[str, int] = Field(default_factory=dict)
    concurrency: Concurrency = Concurrency()


class AdapterCfg(Frozen):
    enabled: bool = True
    driver: str = ""
    capability: str | None = None


class A2ASection(Frozen):
    protocol: str = "a2a/1.0"
    transport: Literal["in_process", "http"] = "in_process"
    inline_payload_limit_bytes: int = 65536
    strict_schema_validation: bool = True
    adapters: dict[str, AdapterCfg] = Field(default_factory=dict)


class AuthCfg(Frozen):
    type: str = "none"
    token_env: str | None = None
    user_env: str | None = None
    profile_env: str | None = None


class Limits(Frozen):
    timeout_s: int = 300
    max_tokens: int | None = None
    rpm: int = 0


class BackendCfg(Frozen):
    driver: str
    tier: Literal["local", "cloud", "paid_api", "dev_tool", "mock"]
    model: str = ""
    base_url: str | None = None
    region: str | None = None
    auth: AuthCfg = AuthCfg()
    capabilities: list[str] = Field(default_factory=list)
    params: dict[str, Any] = Field(default_factory=dict)
    limits: Limits = Limits()
    cost_per_1k_usd: dict[str, float] = Field(default_factory=lambda: {"input": 0.0, "output": 0.0})
    health_check: dict[str, Any] | None = None
    enabled: bool = True
    # cli_agent driver only
    command: str | None = None
    argv: list[str] = Field(default_factory=list)
    result_json_path: str | None = None
    edits_files_directly: bool = False


class StepRoute(Frozen):
    capability: str = "reasoning"
    backend: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)


class IsolationRule(Frozen):
    rule_id: str
    reviewer_steps: list[int]
    must_differ_from: list[int]
    scope: str = "model_and_context"
    on_violation: str = "use_fallback"


class Budgets(Frozen):
    per_job_usd: float = 0.0
    per_step_usd: float = 0.0
    per_step_tokens: int = 0
    on_exceed: str = "halt_and_notify"


class RoutingSection(Frozen):
    defaults: dict[str, str] = Field(default_factory=dict)
    fallback_chains: dict[str, list[str]] = Field(default_factory=dict)
    steps: dict[str, StepRoute] = Field(default_factory=dict)
    isolation: list[IsolationRule] = Field(default_factory=list)
    budgets: Budgets = Budgets()


class RemediationEdge(Frozen):
    from_step: int = Field(alias="from")
    on: str
    to_step: int = Field(alias="to")
    max_loops: int = 3

    model_config = ConfigDict(frozen=True, populate_by_name=True, extra="allow")


class PipelineSection(Frozen):
    start_step: int = 1
    stop_step: int = 24
    parallel_groups: list[list[int]] = Field(default_factory=list)
    remediation_edges: list[RemediationEdge] = Field(default_factory=list)
    on_max_loops_exceeded: str = "halt_and_escalate"


class RetryCfg(Frozen):
    max_attempts: int = 1
    backoff_s: float = 5.0


class StepCfg(Frozen):
    enabled: bool = True
    component: Literal["agent", "tool", "plugin", "gate"] = "agent"
    #: What this step may do. Deny by default: an empty list means read-only,
    #: so a step whose profile is forgotten fails safe rather than silently
    #: inheriting write access. See docs/11-mutation-inventory.md.
    allowed_actions: list[str] = Field(default_factory=list)
    #: Named tools this step may never invoke, whatever the allowlist says.
    #: Enforced again at the gateway (ADR 0004) — this copy is the fast one.
    prohibited_tools: list[str] = Field(default_factory=list)
    risk_level: Literal["low", "medium", "high", "critical"] = "low"
    binding: str | list[str] | None = None
    prompt: str | None = None
    rubric: str | None = None
    timeout_s: int = 600
    retry: RetryCfg = RetryCfg()
    render_documents: list[str] = Field(default_factory=list)
    locked: bool = False
    on_ambiguity: str | None = None


class GatewaySection(Frozen):
    """Rollout state for the MCP execution gateway (ADR 0004).

    `direct` is today's behaviour: writes go through the in-process GuardedFS.
    `shadow` runs every gateway check and journals the verdict without writing,
    so the two paths can be compared before anything depends on the new one.
    `mcp` makes the gateway the only writer — and refuses any backend that
    writes to disk itself, because such a backend would step around it.
    """

    mode: Literal["direct", "shadow", "mcp"] = "direct"
    url: str = "http://127.0.0.1:8081/mcp"
    #: Refuse rather than fall back if the gateway is unreachable. A bypass that
    #: activates under failure is not a boundary.
    fail_closed: bool = True


class ArtifactsSection(Frozen):
    naming_template: str = "{step:02d}_{slug}{variant_suffix}__{job_id}__v{version}.{ext}"
    variant_suffix_template: str = "__{variant}"
    extension_rules: dict[str, Any] = Field(
        default_factory=lambda: {
            "structured": "json",
            "document": ["pdf", "docx"],
            "error_snapshot": "jpg",
            "specification": "md",
        }
    )
    checksum_algorithm: str = "sha256"
    immutable: bool = True
    versioning: str = "increment_on_retry"
    index_file: str = "index.json"


class WriteScope(Frozen):
    source: str = "step_09.allowed_paths"
    deny_globs: list[str] = Field(default_factory=list)
    max_changed_files: int = 40
    max_changed_loc: int = 800
    migrations_require_human_signoff: bool = True


class NonInvention(Frozen):
    on_ambiguity: str = "halt_and_ticket"
    hallucination_detector_step: int = 13
    forbid_requirement_synthesis: bool = True


class QualityThresholds(Frozen):
    min_line_coverage_pct: int = 0
    min_changed_line_coverage_pct: int = 0
    max_cyclomatic_complexity: int = 15
    block_on_severity: list[str] = Field(default_factory=lambda: ["CRITICAL", "HIGH"])


class PolicySection(Frozen):
    write_scope: WriteScope = WriteScope()
    non_invention: NonInvention = NonInvention()
    quality_thresholds: QualityThresholds = QualityThresholds()
    forbidden_dependencies: list[str] = Field(default_factory=list)
    override: dict[str, Any] = Field(default_factory=dict)


class GateRevisionCfg(Frozen):
    """What a reviewer may do about a document they just rejected.

    A rejected gate ends the run: there is no edge to take, because the thing
    that was wrong was the document, and no amount of re-running produces a
    different judgement from the same inputs. Where this is enabled the reviewer
    can answer the rejection with a document of their own instead. The gate then
    re-opens against that document and asks for a fresh decision.

    `replaces_step` and `slug` name the artifact the upload supersedes — the BRD
    belongs to step 05, not to the gate that reviews it. `schema_id` is the
    contract the upload must parse into, so a hand-written BRD constrains the
    rest of the pipeline exactly as the generated one did.
    """

    enabled: bool = False
    #: Whose artifact the upload replaces; the gate itself only writes decisions.
    replaces_step: int | None = None
    slug: str = ""
    #: Filename marker distinguishing a human's document from the model's.
    variant: str = "revised"
    #: Schema the document must parse into, or "" to accept it unparsed.
    schema_id: str = ""
    accepted_extensions: list[str] = Field(default_factory=lambda: ["md", "pdf", "docx"])
    max_bytes: int = 10 * 1024 * 1024
    #: Bounded like a remediation loop: a gate cannot be re-litigated forever.
    max_revisions: int = 3


class GateCfg(Frozen):
    name: str
    required_roles: list[str]
    quorum: int = 1
    bind_to_artifact_sha: bool = True
    block_if_open_findings: bool = False
    reminder_after_hours: int = 24
    escalate_after_hours: int = 72
    escalate_to: list[str] = Field(default_factory=list)
    can_disable: bool = False
    revision: GateRevisionCfg = GateRevisionCfg()


class PluginCfg(Frozen):
    driver: str
    model_config = ConfigDict(frozen=True, extra="allow")


class Redaction(Frozen):
    scrub_pii_from_prompts: bool = True
    patterns: list[str] = Field(default_factory=list)
    never_persist_in: list[str] = Field(default_factory=list)


class SecretsSection(Frozen):
    provider: str = "env"
    vault: dict[str, Any] = Field(default_factory=dict)
    redaction: Redaction = Redaction()
    reject_literal_secrets_in_config: bool = True


class ObservabilitySection(Frozen):
    log_level: str = "INFO"
    log_format: str = "json"
    metrics_sink: dict[str, Any] = Field(default_factory=dict)
    trace_sink: dict[str, Any] = Field(default_factory=dict)
    emit_per_step: list[str] = Field(default_factory=list)
    alerts: dict[str, Any] = Field(default_factory=dict)


class VisualPalette(Frozen):
    """Colours for one visualisation variant.

    Presentation belongs in config for the same reason vendors do: changing how
    a run is drawn should not be a code change. The dashboard reads these; the
    orchestrator itself never looks at them.
    """

    accent: str
    accent_bright: str
    accent_soft: str
    secondary: str
    completed: str
    muted: str
    surface: str
    surface_active: str
    surface_completed: str
    surface_upcoming: str
    pattern: str = ""


class VisualVariantCfg(Frozen):
    """A named way of drawing the 24 steps — the domain metaphor and its palette."""

    label: str
    kicker: str = ""
    headline: str = ""
    route_label: str = ""
    #: Which silhouette the dashboard draws per step. Unknown values fall back.
    vehicle: str = "truck"
    motion: str = "speed-route"
    palette: VisualPalette


class VisualizationSection(Frozen):
    default_variant: str = ""
    variants: dict[str, VisualVariantCfg] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# root
# --------------------------------------------------------------------------- #
class AppConfig(Frozen):
    version: str
    active_profile: str = "local"
    app: AppSection = AppSection()
    a2a: A2ASection = A2ASection()
    backends: dict[str, BackendCfg]
    routing: RoutingSection
    pipeline: PipelineSection = PipelineSection()
    steps: dict[str, StepCfg]
    artifacts: ArtifactsSection = ArtifactsSection()
    gateway: GatewaySection = GatewaySection()
    policy: PolicySection = PolicySection()
    gates: dict[str, GateCfg] = Field(default_factory=dict)
    plugins: dict[str, PluginCfg] = Field(default_factory=dict)
    observability: ObservabilitySection = ObservabilitySection()
    secrets: SecretsSection = SecretsSection()
    visualization: VisualizationSection = VisualizationSection()

    # ------------------------------------------------------------------ #
    def step_cfg(self, step: int) -> StepCfg:
        return self.steps[f"{step:02d}"]

    def route(self, step: int) -> StepRoute:
        return self.routing.steps.get(f"{step:02d}", StepRoute())

    def resolve_backend_id(self, step: int) -> str | None:
        """Which backend id a step would use, ignoring isolation rules."""
        route = self.routing.steps.get(f"{step:02d}")
        if route is None:
            return None
        return route.backend or self.routing.defaults.get(route.capability)

    def enabled_steps(self) -> list[int]:
        return sorted(int(k) for k, v in self.steps.items() if v.enabled)

    # ------------------------------------------------------------------ #
    def project_path(self, job_id: str = "") -> Path:
        """Which project the run edits.

        `app.project.path` wins when set; otherwise the workspace path, which is
        what every existing config already relies on.
        """
        template = self.app.project.path or self.app.paths.workspace
        return Path(template.format(job_id=job_id)).expanduser()

    def validate_project_path(self, job_id: str = "") -> Path:
        """Resolve the project path, or say precisely what is wrong with it.

        Called at boot and by `codegen-core config validate`. The messages name the
        offending path and the key that set it, because the person reading them
        is looking at a config file, not at this function.
        """
        path = self.project_path(job_id)
        configured = bool(self.app.project.path)
        source = "app.project.path" if configured else "app.paths.workspace"

        if not str(path).strip():
            raise ConfigError(
                f"{source} is empty: set it to the project the story is implemented against"
            )
        # Without an explicit project the workspace is scratch space the run
        # creates for itself, so it is not required to exist beforehand.
        if not configured:
            return path
        if not path.exists():
            if not self.app.project.must_exist:
                return path
            raise ConfigError(
                f"{source} points at '{path}', which does not exist. Create it, correct "
                f"the path, or set app.project.must_exist=false to let the run create it."
            )
        if not path.is_dir():
            raise ConfigError(f"{source} points at '{path}', which is a file, not a directory")
        if self.app.project.must_be_writable and not os.access(path, os.W_OK):
            raise ConfigError(
                f"{source} points at '{path}', which is not writable by this process. "
                "The pipeline edits code there from step 12 onwards."
            )
        return path

    # ------------------------------------------------------------------ #
    def assert_invariants(self) -> None:
        """Fail at boot rather than at step 14."""
        # 0. the project the run edits has to be usable before anything routes
        if self.app.project.path:
            self.validate_project_path()

        # 1. every routed capability resolves to an enabled backend
        for cap, bid in self.routing.defaults.items():
            b = self.backends.get(bid)
            if b is None or not b.enabled:
                raise ConfigError(f"routing.defaults.{cap} -> '{bid}' is missing or disabled")

        # 2. each step's backend actually declares the capability it is routed for
        for skey, route in self.routing.steps.items():
            bid = route.backend or self.routing.defaults.get(route.capability)
            if bid is None:
                raise ConfigError(f"step {skey}: no backend for capability '{route.capability}'")
            b = self.backends.get(bid)
            if b is None or not b.enabled:
                raise ConfigError(f"step {skey} -> backend '{bid}' is missing or disabled")
            if route.capability not in b.capabilities:
                raise ConfigError(
                    f"step {skey}: backend '{bid}' lacks capability '{route.capability}'"
                )

        # 3. reviewer isolation must be satisfiable
        for rule in self.routing.isolation:
            pool = {
                self.resolve_backend_id(s)
                for s in rule.reviewer_steps + rule.must_differ_from
                if self.resolve_backend_id(s)
            }
            for cap_chain in self.routing.fallback_chains.values():
                pool.update(c for c in cap_chain if self.backends.get(c, None) and self.backends[c].enabled)
            if len(pool) < 2:
                raise ConfigError(
                    f"isolation rule '{rule.rule_id}' is unsatisfiable: "
                    "fewer than two distinct enabled backends available"
                )

        # 3b. every declared action is one the pipeline knows, and only the
        #     steps the inventory sanctions may mutate
        known = {"read", "create_artifact", "apply_patch", "run_test", "run_scan",
                 "publish", "approve"}
        mutating = {"apply_patch", "publish"}
        for skey, scfg in self.steps.items():
            unknown = set(scfg.allowed_actions) - known
            if unknown:
                raise ConfigError(
                    f"step {skey}: unknown action(s) {sorted(unknown)}; "
                    f"allowed: {sorted(known)}"
                )
            if set(scfg.allowed_actions) & mutating and scfg.risk_level == "low":
                raise ConfigError(
                    f"step {skey} may mutate ({sorted(set(scfg.allowed_actions) & mutating)}) "
                    f"but declares risk_level 'low'; a mutating step is at least 'medium'"
                )

        # 4. the two human gates cannot be turned off by any config path
        for g in MANDATORY_GATES:
            cfg = self.steps.get(g)
            if cfg is None or not cfg.enabled or cfg.component != "gate":
                raise ConfigError(
                    f"step {g} is a mandatory human gate; it must exist, be enabled, "
                    "and have component='gate'"
                )
            gate = self.gates.get(g)
            if gate is not None and gate.can_disable:
                raise ConfigError(f"gates.{g}.can_disable must be false")

        # 4b. a gate whose rejection is answered by a human document must say
        #     which artifact that document replaces, and must not also declare a
        #     REJECTED edge — two contradictory answers to the same rejection.
        for key, gate in self.gates.items():
            rev = gate.revision
            if not rev.enabled:
                continue
            if rev.replaces_step is None or f"{rev.replaces_step:02d}" not in self.steps:
                raise ConfigError(
                    f"gates.{key}.revision.replaces_step must name a step in this pipeline"
                )
            if not rev.slug:
                raise ConfigError(f"gates.{key}.revision.slug must name the artifact it replaces")
            if not rev.accepted_extensions:
                raise ConfigError(f"gates.{key}.revision.accepted_extensions cannot be empty")
            if rev.max_revisions < 1 or rev.max_bytes < 1:
                raise ConfigError(f"gates.{key}.revision needs max_revisions and max_bytes >= 1")
            if any(e.from_step == int(key) and e.on == "REJECTED" for e in self.pipeline.remediation_edges):
                raise ConfigError(
                    f"gate {key} accepts a replacement document, so a REJECTED remediation "
                    "edge would send the run backwards instead of waiting for it; remove one"
                )

        # 5. remediation edges must point at real steps and have a loop budget
        valid = set(self.steps)
        for e in self.pipeline.remediation_edges:
            if f"{e.from_step:02d}" not in valid or f"{e.to_step:02d}" not in valid:
                raise ConfigError(f"remediation edge {e.from_step}->{e.to_step} references unknown step")
            if e.max_loops < 1:
                raise ConfigError(f"remediation edge {e.from_step}->{e.to_step} needs max_loops >= 1")

        # 6. no literal secrets committed to git
        if self.secrets.reject_literal_secrets_in_config:
            self._scan_for_secret_literals()

    def _scan_for_secret_literals(self) -> None:
        blob = self.model_dump_json()
        for pat in SECRET_LITERALS:
            if pat.search(blob):
                raise ConfigError(
                    "a literal secret appears in the resolved config; use ${env:VAR} instead"
                )


# --------------------------------------------------------------------------- #
class ConfigLoader:
    """Reads config.json, applies the active profile, validates, returns AppConfig."""

    DEFAULT_PATH = Path("config/config.json")

    @staticmethod
    def load(path: str | Path | None = None, profile: str | None = None) -> AppConfig:
        p = Path(path or os.getenv("CODEGEN_CONFIG", ConfigLoader.DEFAULT_PATH))
        if not p.exists():
            raise ConfigError(f"config not found: {p}")
        raw = json.loads(p.read_text())

        active = profile or os.getenv("CODEGEN_PROFILE") or raw.get("default_profile", "local")
        profiles = raw.pop("profiles", {})
        overlay = profiles.get(active)
        if overlay is None:
            raise ConfigError(f"unknown profile '{active}'; have {sorted(profiles)}")

        merged = deep_merge(raw, overlay)
        merged["active_profile"] = active
        merged.pop("$schema", None)
        merged.pop("default_profile", None)

        cfg = AppConfig.model_validate(interpolate(merged))
        cfg.assert_invariants()
        return cfg
