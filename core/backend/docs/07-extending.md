# Extending CodeGen Core

Four things you are likely to add. Each starts with the same question: **does
this need code at all?** Most extensions are a JSON block.

---

## Adding a model

### Case 1 — it speaks a protocol we already have (no code)

Together, Groq, vLLM, LM Studio, OpenRouter, Fireworks, and most internal
gateways all speak the OpenAI wire protocol. They differ only by `base_url` and
which env var holds the token.

```json
"cloud.groq.llama": {
  "driver": "openai_compatible",
  "tier": "cloud",
  "model": "llama-3.3-70b-versatile",
  "base_url": "https://api.groq.com/openai/v1",
  "auth": { "type": "bearer", "token_env": "GROQ_API_KEY" },
  "capabilities": ["fast", "coding"],
  "params": { "temperature": 0.2 },
  "limits": { "timeout_s": 120, "rpm": 30 },
  "cost_per_1k_usd": { "input": 0.00059, "output": 0.00079 },
  "enabled": true
}
```

Then add it to the relevant `routing.fallback_chains` entries and put the
variable in `.env.example`. That is the entire change.

Headless CLI agents are the same story with a different driver:

```json
"devtool.copilot": {
  "driver": "cli_agent",
  "tier": "dev_tool",
  "model": "copilot-cli",
  "command": "gh",
  "argv": ["copilot", "suggest", "-t", "shell", "{prompt}"],
  "result_json_path": "$.result",
  "edits_files_directly": false,
  "capabilities": ["coding"],
  "enabled": true
}
```

Set `edits_files_directly` honestly. Getting it wrong in the permissive
direction means step 12 skips the post-hoc audit on a backend that *did* write
to disk.

### Case 2 — genuinely new protocol (one small module)

```python
# src/codegen_core/llm/backends/vertex.py
class VertexBackend(BaseBackend):
    tier = "cloud"

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        try:
            from langchain_google_vertexai import ChatVertexAI
        except ImportError as exc:
            raise BackendError("pip install 'codegen-core[vertex]'") from exc
        resp = ChatVertexAI(model=self.model_id, **params).invoke(
            [("system", system), ("human", user)]
        )
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(resp.content, meta.get("input_tokens", 0),
                          meta.get("output_tokens", 0), resp)
```

Register it in `llm/factory.DRIVERS`. Import the SDK **lazily inside the
method** — that is what keeps `pip install codegen-core` working without every
vendor's dependencies.

Verify: `codegen-core config validate && codegen-core config health && codegen-core config
explain --step 12`.

---

## Adding a step

Use `/new-step 25 performance_benchmark plugin` in Claude Code, or do it by hand:

**1. The step file** — `src/codegen_core/steps/25_performance_benchmark.py`

```python
"""Step 25 - Performance Benchmark.

Component: PLUGIN               Category: Performance Validation

Why a plugin rather than an agent: a benchmark produces numbers, and the same
code should produce the same numbers. A model asked to judge performance
introduces variance into the one place you least want it.
"""

class PerformanceBenchmark(Plugin):
    step = 25          # NOT 025 — a leading zero is a Python syntax error
    name = "performance_benchmark"
    category = "Performance Validation"
    consumes = ["CodeChangesetV1", "FeatureSpecV1"]
    produces = ["25_benchmark__{job}__v{v}.json"]
    accepts = ["application/json"]

    def handle(self, env, ctx):
        ...

STEP = PerformanceBenchmark()      # exactly one export, named STEP
```

The docstring convention matters. Every step explains *why it is that component
kind* rather than another — that is the reasoning a future maintainer needs and
cannot recover from the code.

**2. The schema** (if it emits new structured data) — add to
`schemas/`, register in `schemas/__init__.REGISTRY`.

**3. A mock stub** — add to `llm/backends/mock.py::STUBS` keyed by schema id, or
every offline run fails at your new step.

**4. Config** — `steps["25"]` with `enabled`, `component`, `timeout_s`, `retry`,
and `prompt` if it's an agent; `routing.steps["25"]` naming its capability; a
remediation edge if it can fail recoverably.

**5. The prompt** (agents only) — `config/prompts/25_*.system.md`. Prompts state
constraints and reasoning, not just output format. Read the existing sixteen for
tone.

**6. A test** — cover the step's *specific* contract. Not "it runs" but "it
refuses what it should refuse".

**7. Verify** — `codegen-core config validate && pytest -q && CODEGEN_PROFILE=local
CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042`.

### Things the loader will reject

- Filename not matching `NN_snake_case.py`
- No `STEP` export
- `STEP.step` disagreeing with the filename prefix
- `STEP.kind` disagreeing with `config.steps.NN.component`
- Any registry missing steps 06 or 24

These are hard errors, not warnings. A silently misnumbered step corrupts
artifact names and the journal.

---

## Adding a plugin vendor

Swapping Semgrep for SonarQube touches one module and one config line.

```python
# src/codegen_core/plugins/sast_sonarqube.py
class SonarQubePlugin(BasePlugin):
    capability = "sast"
    driver = "sonarqube"

    def scan(self, workspace: Path) -> dict:
        if self.dry_run:
            return {"scanner": "sonarqube", "findings": []}
        ...
        return {"scanner": "sonarqube", "findings": [...]}   # SastReportV1 shape
```

Register in `plugins/factory.REGISTRY["sast"]`, then:

```json
"plugins": { "sast": { "driver": "sonarqube", "host_url": "${env:SONAR_URL}" } }
```

Two contracts to honour: return the shape the capability's schema expects
(`SastReportV1` for scanners), and implement `dry_run` so the `local` profile
still runs offline. A plugin without `dry_run` breaks everyone's smoke test.

---

## Adding a modality adapter

The A2A layer converts payloads so senders never adapt to receivers. To support
a new conversion — say, Excel to structured JSON for a data-migration ticket:

```python
# core/negotiate.py
def xlsx_to_structured(part: BlobPart, ctx: Any) -> JsonPart:
    import openpyxl
    wb = openpyxl.load_workbook(ctx.artifacts.local_path(part.uri))
    return JsonPart(schema_id="SpreadsheetV1", data={...})

ADAPTERS[("application/vnd.…sheet", "application/json")] = xlsx_to_structured
```

Then declare it in `config.a2a.adapters` so it can be toggled per profile:

```json
"a2a": { "adapters": {
  "application/vnd.…sheet->application/json": { "enabled": true }
}}
```

Adapters degrade rather than crash where possible — `pdf_to_markdown` returns a
placeholder when PyMuPDF is absent — but a *missing* adapter raises
`UnsupportedModality` deliberately. A reviewer who silently never saw the
failure evidence is worse off than one who saw an error.

---

## Adding a profile

Profiles are named overlays, deep-merged over the base config:

```json
"profiles": {
  "eu_regulated": {
    "routing": { "defaults": { "coding": "cloud.bedrock.eu", "reasoning": "cloud.bedrock.eu" } },
    "policy": {
      "quality_thresholds": { "min_changed_line_coverage_pct": 95 },
      "write_scope": { "max_changed_loc": 400 }
    },
    "gates": { "24": { "quorum": 2, "required_roles": ["tech_lead", "security_owner"] } },
    "secrets": { "provider": "vault" }
  }
}
```

Nested dicts merge, scalars replace — so changing `routing.defaults.coding`
leaves `routing.fallback_chains` intact.

What a profile **cannot** do: disable a gate, set `can_disable`, or make an
isolation rule unsatisfiable. Those are checked after the merge.

---

## Changing a schema

Schemas are append-only. Never edit a released `V1` in place — add `V2`
alongside it and register both.

```python
class BrdV2(BaseModel):
    ...                       # BrdV1 fields
    compliance_notes: list[str] = Field(default_factory=list)
```

The reason is the journal. Artifacts on disk were validated against the schema
that existed when they were written. Mutating `V1` means old jobs can no longer
be replayed or audited — which defeats the point of keeping them.

---

## Checklist for any change

```bash
codegen-core config validate                                   # invariants hold
pytest -q                                                 # 58 tests
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
```

If you touched the write guard, the router, or the config invariants, also add a
test that would have failed *before* your change. The safety properties in
`docs/06-safety-model.md` are only real while their tests are.
