# The A2A Protocol

## Why a protocol at all

Components could pass dictionaries. They don't, for three reasons: provenance
has to travel with the payload, receivers have to be able to validate what they
were given, and the boundary has to survive being moved across a process.

## Two layers

**Parts** — the modality layer. One piece of content.

| Part | Carries | Notes |
|---|---|---|
| `TextPart` | prose | mime defaults to `text/plain` |
| `JsonPart` | structured data + `schema_id` | receiver validates against the registry |
| `BlobPart` | images, PDFs, DOCX, diffs | referenced by `artifact://` URI, not inlined |

Blobs are references by design. Inlining a 3 MB PDF into every envelope that
passes it along would blow the context window of whatever model receives it.
`inline_b64` exists only for payloads under
`config.a2a.inline_payload_limit_bytes`.

**Envelope** — the transport layer.

```python
Envelope(
    protocol="a2a/1.0",
    message_id="msg_a1b2c3",
    correlation_id="DEEP-1042-53324e",   # the job — threads all 24 steps
    trace_id="trace_x9y8",               # one attempt
    sender=ComponentRef(step=9, name="impact_analysis", kind="AGENT"),
    recipient=ComponentRef(step=12, name="code_update", kind="AGENT"),
    intent=Intent.RESULT,
    status="OK",
    accepts=["application/json"],        # what the RECIPIENT can ingest
    parts=[JsonPart(schema_id="ImpactManifestV1", data={...})],
    provenance=Provenance(model_id="claude-sonnet-4-6", cost_usd=0.012, ...),
)
```

`correlation_id` is what makes an audit possible: filter the journal by it and
you have the complete history of one ticket.

## Negotiation — the modality-agnostic part

The sender attaches what it has. The receiver declares what it can read. The bus
converts on delivery.

```python
# core/negotiate.py
ADAPTERS = {
    ("application/json", "text/plain"):   json_pretty_print,
    ("application/pdf",  "text/markdown"): pdf_to_markdown,
    ("image/jpeg",       "text/plain"):    caption_via_vision_model,
    ("text/x-diff",      "application/json"): diff_to_structured_hunks,
}
```

Worked example. Step 17 fails and produces `17_e2e__failure_1__JOB__v1.jpg`.
Step 23 (the reviewer) is routed to a text-only local model that declares
`accepts=["application/json", "text/x-diff"]`.

1. The bus sees an `image/jpeg` part and no match in `accepts`.
2. It finds the `image/jpeg → text/plain` adapter.
3. That adapter asks the router for *any* backend with the `vision` capability,
   captions the screenshot, and substitutes a `TextPart`.
4. The reviewer receives a description of the broken screen.

Neither step knows this happened. Step 17 attached an image; step 23 read text.

If no adapter exists, `UnsupportedModality` is raised rather than the part being
silently dropped — a reviewer that quietly never saw the failure evidence is
worse than a loud error.

## Intents

| Intent | Meaning |
|---|---|
| `REQUEST` | Orchestrator asking a component to work |
| `RESULT` | Success |
| `ERROR` | Failure — the runner consults remediation edges |
| `GATE_WAIT` | Blocked on a human |
| `REVIEW` | Independent review output |
| `REMEDIATE` | A retry carrying the reason for the previous failure |

`status` is finer-grained than intent and is what the remediation table keys on:
`FAILED`, `BLOCKING_FINDINGS`, `CHANGES_REQUESTED`, `AMBIGUOUS`, `REJECTED`,
`POLICY_VIOLATION`.

## Provenance

Attached to every envelope, recorded in the journal:

```python
Provenance(
    backend_id="paid.anthropic.sonnet",
    model_id="claude-sonnet-4-6",     # pinned; the exact version that ran
    prompt_sha256="9f2c...",          # the exact prompt, hashed
    tokens_in=1204, tokens_out=380,
    cost_usd=0.0093,
    parent_message_ids=["msg_a1b2c3"],
)
```

`model_id` is what reviewer isolation reads. When the router resolves step 23, it
asks the journal which model executed step 12 and walks the fallback chain if
they would match.
