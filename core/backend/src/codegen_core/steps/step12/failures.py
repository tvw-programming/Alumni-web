"""Prior-failure payloads for step-12 prompt injection."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from codegen_core.core.envelope import FailureClass, FailurePayload, failure_class_for


def summarize_findings(env: Any) -> list[str]:
    """Pull short finding strings from envelope parts without inlining blobs."""
    findings: list[str] = []
    for part in getattr(env, "parts", None) or []:
        data = getattr(part, "data", None)
        if not isinstance(data, dict):
            continue
        for key in ("findings", "violations", "errors", "failures", "blocking"):
            raw = data.get(key)
            if isinstance(raw, list):
                for item in raw[:20]:
                    if isinstance(item, str):
                        findings.append(item[:500])
                    elif isinstance(item, dict):
                        msg = item.get("message") or item.get("summary") or item.get("text")
                        if msg:
                            findings.append(str(msg)[:500])
            elif isinstance(raw, str) and raw.strip():
                findings.append(raw[:500])
        if data.get("passed") is False and data.get("checks"):
            for label, check in (data.get("checks") or {}).items():
                if isinstance(check, dict) and not check.get("ok", True):
                    findings.append(f"{label}: {check.get('stderr') or check.get('detail') or 'failed'}"[:500])
    return findings[:30]


def failure_payload_from_env(step: int, env: Any) -> FailurePayload:
    fclass = failure_class_for(step, env)
    body = {
        "status": getattr(env, "status", None),
        "schemas": list(getattr(env, "schema_ids", lambda: [])()),
        "failure_class": fclass.value,
    }
    digest = hashlib.sha256(
        json.dumps(body, sort_keys=True, default=str).encode()
    ).hexdigest()
    findings = summarize_findings(env)
    summary = (
        f"step {step:02d} {getattr(env, 'status', 'FAILED')} "
        f"[{fclass.value}]"
        + (f": {findings[0]}" if findings else "")
    )
    return FailurePayload(
        step_id=f"{step:02d}",
        failure_class=fclass.value,
        envelope_sha256=digest,
        summary=summary[:400],
        findings=findings,
    )


def remember_failure(ctx: Any, step: int, env: Any) -> FailurePayload:
    """Append a FailurePayload to the job store (keep last 3)."""
    payload = failure_payload_from_env(step, env)
    prior = list(ctx.store.get("_prior_failures") or [])
    prior.append(payload.model_dump(mode="json"))
    ctx.store["_prior_failures"] = prior[-3:]
    ctx.journal.append_event(
        "failure_payload",
        step=step,
        failure_class=payload.failure_class,
        summary=payload.summary,
        findings_count=len(payload.findings),
    )
    return payload


def prior_failures_from_ctx(ctx: Any, *, limit: int = 3) -> list[FailurePayload]:
    """Last N failure payloads: store first, then journal fallback."""
    stored = list(ctx.store.get("_prior_failures") or [])
    if stored:
        return [FailurePayload.model_validate(p) for p in stored[-limit:]]

    out: list[FailurePayload] = []
    for entry in reversed(ctx.journal.entries()):
        if entry.get("type") != "event" or entry.get("event") != "failure_payload":
            continue
        out.append(
            FailurePayload(
                step_id=f"{int(entry.get('step', 0)):02d}",
                failure_class=str(entry.get("failure_class") or FailureClass.OTHER.value),
                summary=str(entry.get("summary") or ""),
                findings=[],
            )
        )
        if len(out) >= limit:
            break
    out.reverse()
    return out


def extend_prompt_with_failures(user: str, prior_failures: list[FailurePayload]) -> str:
    """Append a compact prior-failures section to the agent user prompt."""
    if not prior_failures:
        return user
    lines = [f"- {fp.summary}" for fp in prior_failures]
    detail_blocks: list[str] = []
    for fp in prior_failures:
        if not fp.findings:
            continue
        bullets = "\n".join(f"  • {f}" for f in fp.findings[:15])
        detail_blocks.append(f"### step {fp.step_id} ({fp.failure_class})\n{bullets}")
    section = "\n---\nPrior failures:\n" + "\n".join(lines)
    if detail_blocks:
        section += "\n\nDetailed findings:\n" + "\n\n".join(detail_blocks)
    return user + section
