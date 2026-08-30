"""Content validation on generated code, built on guardrails-ai.

Two levels, as specified: `pipeline` runs inside the step, `gateway` runs at the
MCP boundary. Both use the same `Guard`, so a caller that skipped its own checks
cannot get a different verdict at the other end.

**Why custom validators rather than hub ones.** guardrails-ai 0.10 ships the
framework — `Guard`, `Validator`, `OnFailAction`, `ValidationOutcome` — and
nothing else. Every concrete validator (`DetectSecrets`, `ToxicLanguage`, …)
lives on the hub behind `guardrails hub install`, which needs an API token and
network access at install time. That is a deployment decision, not a code one,
so the validators below are registered locally through the same
`@register_validator` mechanism the hub uses. Swapping one for a hub validator
later is a one-line change in `build_guard`.

What guardrails-ai gives us that hand-rolled checks did not:

* **`ValidationOutcome`** — a structured record of every validator that ran,
  what it found and where, which is the per-step report this needs to produce.
* **`ErrorSpan`** — character offsets, so a finding points at the text rather
  than at a line number someone has to go and count.
* **`OnFailAction.EXCEPTION`** — the fail policy is declared with the validator
  instead of being an `if` at the call site that someone can forget.
* One `Guard` composing many validators, with one report for the set.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal

from .errors import PolicyViolation

GuardrailLevel = Literal["pipeline", "gateway"]

# --------------------------------------------------------------------------- #
# Patterns
#
# Shapes, not entropy. An entropy threshold flags every UUID and base64 blob in
# a test fixture, and a check that cries wolf gets switched off.
# --------------------------------------------------------------------------- #
SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("openai_key", re.compile(r"\bsk-(?:proj-|live-)?[A-Za-z0-9]{20,}\b")),
    ("anthropic_key", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}\b")),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("google_api_key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b")),
    ("private_key_block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b")),
    (
        "assigned_credential",
        re.compile(
            r"""(?ix)
            \b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b
            \s*[:=]\s*
            ["'](?!\s*$)(?!x{3,}|\*{3,}|<[^>]+>|\$\{|changeme|placeholder|your[_-])
            [^"']{8,}["']
            """
        ),
    ),
)

UNSAFE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("shell_true", re.compile(r"subprocess\.\w+\([^)]*shell\s*=\s*True")),
    ("os_system", re.compile(r"\bos\.system\s*\(")),
    ("eval", re.compile(r"(?<![\w.])eval\s*\(")),
    ("exec", re.compile(r"(?<![\w.])exec\s*\(")),
    ("pickle_loads", re.compile(r"\bpickle\.loads?\s*\(")),
    ("yaml_unsafe_load", re.compile(r"\byaml\.load\s*\((?![^)]*Loader\s*=)")),
    ("verify_disabled", re.compile(r"verify\s*=\s*False")),
    ("md5_or_sha1_digest", re.compile(r"\bhashlib\.(?:md5|sha1)\s*\(")),
)


def _mask(secret: str) -> str:
    """Never quote a credential in full.

    The finding reaches the journal, a span and the dashboard; quoting it there
    turns one leak into four.
    """
    return f"{secret[:4]}…{secret[-2:]}" if len(secret) > 8 else "…"


# --------------------------------------------------------------------------- #
# Validators
# --------------------------------------------------------------------------- #
def _install_validators() -> tuple[Any, Any] | None:
    """Register the validators once, or report that the package is absent.

    Registration happens at import inside guardrails-ai's global registry, so
    this is guarded to stay idempotent under test reloads.
    """
    try:
        from guardrails import register_validator
        from guardrails.settings import settings
        from guardrails.validators import (
            ErrorSpan,
            FailResult,
            PassResult,
            ValidationResult,
            Validator,
        )
    except ImportError:
        return None

    # guardrails-ai ships an OTLP exporter pointed at a vendor endpoint and
    # turns it on by default. This pipeline handles source code and, in the
    # telehealth profile, PHI — none of which should leave the host to a third
    # party as a side effect of installing a validation library. It also
    # installs its own tracer provider, which would fight core/tracing.py for
    # the global one.
    #
    # Disabled before any Validator is instantiated: HubTelemetry is
    # constructed in Validator.__init__ when settings.rc.enable_metrics is True,
    # which is the shipped default and is read from ~/.guardrailsrc.
    #
    # Both switches, because they gate different exporters — disable_tracing
    # covers the span decorators, rc.enable_metrics covers the hub reporter.
    settings.disable_tracing = True
    settings.rc.enable_metrics = False

    @register_validator(name="codegen/no-secrets", data_type="string")
    class NoSecrets(Validator):
        """Credential-shaped values in generated code.

        Runs at generation time rather than waiting for the step-18 secret scan:
        by then the credential is on disk, in the diff, and in every artifact
        between.
        """

        def validate(self, value: Any, metadata: dict[str, Any]) -> ValidationResult:
            text = str(value)
            spans: list[ErrorSpan] = []
            rules: list[str] = []

            for rule, pattern in SECRET_PATTERNS:
                for match in pattern.finditer(text):
                    spans.append(
                        ErrorSpan(
                            start=match.start(),
                            end=match.end(),
                            reason=f"{rule}: {_mask(match.group(0))}",
                        )
                    )
                    rules.append(rule)

            if not spans:
                return PassResult()
            return FailResult(
                error_message=(
                    f"{len(spans)} credential-shaped value(s) in generated code "
                    f"({', '.join(sorted(set(rules)))})"
                ),
                error_spans=spans,
            )

    @register_validator(name="codegen/no-unsafe-apis", data_type="string")
    class NoUnsafeApis(Validator):
        """Calls whose presence in *generated* code is almost always a mistake.

        Not a general lint — step 14 runs ruff and bandit. These are the handful
        where a model reaches for the dangerous form out of habit.
        """

        def validate(self, value: Any, metadata: dict[str, Any]) -> ValidationResult:
            text = str(value)
            spans: list[ErrorSpan] = []
            rules: list[str] = []

            for rule, pattern in UNSAFE_PATTERNS:
                for match in pattern.finditer(text):
                    spans.append(
                        ErrorSpan(start=match.start(), end=match.end(), reason=rule)
                    )
                    rules.append(rule)

            if not spans:
                return PassResult()
            return FailResult(
                error_message=(
                    f"{len(spans)} unsafe call(s) in generated code "
                    f"({', '.join(sorted(set(rules)))})"
                ),
                error_spans=spans,
            )

    return NoSecrets, NoUnsafeApis


_VALIDATORS = _install_validators()
GUARDRAILS_AVAILABLE = _VALIDATORS is not None


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Finding:
    rule: str
    path: str
    excerpt: str


@dataclass(frozen=True)
class GuardrailResult:
    """One validator's verdict, tagged with the level that ran it.

    Levels are never merged. A single "validation passed" flag hides which layer
    checked, and therefore which layer was missing when something got through.
    """

    level: GuardrailLevel
    name: str
    passed: bool
    findings: list[Finding] = field(default_factory=list)
    reason: str | None = None

    def as_event(self) -> dict[str, Any]:
        return {
            "guardrail_level": self.level,
            "guardrail_name": self.name,
            "guardrail_result": "passed" if self.passed else "failed",
            "reason": self.reason,
            "findings": [
                {"rule": f.rule, "path": f.path, "excerpt": f.excerpt} for f in self.findings
            ],
        }


def _silence_hub_telemetry() -> None:
    """Stop guardrails-ai exporting spans to its vendor endpoint.

    `HubTelemetry` is a singleton created lazily during `Guard` construction,
    reading `settings.rc.enable_metrics` (shipped default: True) exactly once.
    Setting the flag earlier does not help if something else built the instance
    first, so this reaches the live object and shuts its processor down.

    Called after every `Guard` is built. Cheap, idempotent, and the alternative
    is a code-generation pipeline quietly posting traces to a third party.
    """
    try:
        from guardrails.settings import settings
        from guardrails.utils.hub_telemetry_utils import HubTelemetry

        settings.disable_tracing = True
        settings.rc.enable_metrics = False

        instance = getattr(HubTelemetry, "_instance", None)
        if instance is None:
            return
        instance._enabled = False
        for attribute in ("_prov", "_tracer_provider", "_processor"):
            target = getattr(instance, attribute, None)
            if target is not None and hasattr(target, "shutdown"):
                target.shutdown()
    except Exception:  # noqa: BLE001 - never fail a run over telemetry
        pass


def build_guard(name: str) -> Any:
    """A `Guard` composing every validator, failing hard on any of them.

    `OnFailAction.EXCEPTION` is declared here with the validator rather than as
    an `if` at the call site: the plan's rule is never to silently "fix" an
    unsafe patch, and a policy attached to the validator cannot be forgotten by
    a caller.
    """
    if not GUARDRAILS_AVAILABLE:
        raise PolicyViolation(
            "guardrails-ai is required for content validation: "
            "pip install 'codegen_core[guardrails]'"
        )

    from guardrails import Guard, OnFailAction

    no_secrets, no_unsafe = _VALIDATORS  # type: ignore[misc]
    guard = Guard.for_string(
        validators=[
            no_secrets(on_fail=OnFailAction.EXCEPTION),
            no_unsafe(on_fail=OnFailAction.EXCEPTION),
        ],
        name=name,
    )
    _silence_hub_telemetry()
    return guard


def _findings_from(outcome: Any, path: str, rule_name: str) -> list[Finding]:
    """Turn guardrails-ai error spans into locatable findings.

    The span's `reason` already carries the masked value from the validator, so
    nothing here re-reads the source text — which is what keeps the credential
    out of the report.
    """
    findings: list[Finding] = []
    for summary in getattr(outcome, "validation_summaries", None) or []:
        for span in getattr(summary, "error_spans", None) or []:
            findings.append(
                Finding(rule=rule_name, path=path, excerpt=str(getattr(span, "reason", "")))
            )
    return findings


def run_generated_code_guardrails(
    files: dict[str, str],
    intent: dict[str, Any],
    *,
    mutating: bool,
    level: GuardrailLevel = "pipeline",
) -> list[GuardrailResult]:
    """Validate every generated file, then make one decision.

    Every file is validated before anything raises, so a changeset with a secret
    in one file and an unsafe call in another reports both. Fixing one problem
    per pipeline run is how a review budget disappears.
    """
    guard = build_guard(f"codegen-{level}")

    results: list[GuardrailResult] = []
    failures: list[GuardrailResult] = []

    for path, content in files.items():
        try:
            guard.validate(content)
        except Exception as exc:  # guardrails raises ValidationError on EXCEPTION
            outcome = getattr(exc, "validation_result", None) or getattr(exc, "outcome", None)
            findings = _findings_from(outcome, path, "guardrails") if outcome else []
            if not findings:
                findings = [Finding(rule="guardrails", path=path, excerpt=str(exc)[:200])]
            failure = GuardrailResult(
                level=level,
                name="generated_code",
                passed=False,
                findings=findings,
                reason=str(exc)[:300],
            )
            results.append(failure)
            failures.append(failure)
        else:
            results.append(
                GuardrailResult(level=level, name="generated_code", passed=True)
            )

    if failures and mutating:
        detail = "; ".join(
            f"{f.findings[0].path}: {f.reason}" for f in failures if f.findings
        )
        raise PolicyViolation(f"generated code rejected by {level} guardrails — {detail}")

    return results
