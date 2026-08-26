"""Modality negotiation.

Components declare `accepts` (mime types they can ingest). When a sender's part
does not match, adapt() downgrades it - image to caption, pdf to markdown, diff
to structured hunks - using the adapter table from config.a2a.adapters.

This is what makes the protocol modality agnostic: a text-only backend can still
be handed a screenshot.
"""

from __future__ import annotations

import fnmatch
import json
from collections.abc import Callable
from typing import Any

from .errors import UnsupportedModality
from .parts import BlobPart, JsonPart, Modality, Part, TextPart


def matches(mime: str, accepts: list[str]) -> bool:
    return any(fnmatch.fnmatch(mime, pattern) for pattern in accepts)


# --------------------------------------------------------------------------- #
# adapter implementations
# --------------------------------------------------------------------------- #
def json_pretty_print(part: JsonPart, ctx: Any) -> TextPart:
    return TextPart(text=json.dumps(part.data, indent=2, default=str), name=part.schema_id)


def pdf_to_markdown(part: BlobPart, ctx: Any) -> TextPart:
    try:
        import fitz  # type: ignore
    except ImportError:
        return TextPart(
            mime_type="text/markdown",
            text=f"[pdf not extracted - pymupdf unavailable] {part.uri}",
            name=part.name,
        )
    path = ctx.artifacts.local_path(part.uri)
    with fitz.open(path) as doc:
        body = "\n\n".join(page.get_text() for page in doc)
    return TextPart(mime_type="text/markdown", text=body, name=part.name)


def caption_via_vision_model(part: BlobPart, ctx: Any) -> TextPart:
    """Describe an image using whichever backend declares the vision capability."""
    model = ctx.router.model_for_capability("vision")
    if model is None:
        return TextPart(text=f"[image, no vision backend enabled] {part.uri}", name=part.name)
    caption = model.describe_image(ctx.artifacts.local_path(part.uri))
    return TextPart(text=caption, name=part.name)


def diff_to_structured_hunks(part: BlobPart, ctx: Any) -> JsonPart:
    from ..tools.diff_tools import parse_unified_diff

    raw = ctx.artifacts.read_text(part.uri)
    return JsonPart(schema_id="DiffHunksV1", data={"files": parse_unified_diff(raw)})


ADAPTERS: dict[tuple[str, str], Callable[[Any, Any], Part]] = {
    ("application/json", "text/plain"): json_pretty_print,
    ("application/pdf", "text/markdown"): pdf_to_markdown,
    ("image/jpeg", "text/plain"): caption_via_vision_model,
    ("image/png", "text/plain"): caption_via_vision_model,
    ("text/x-diff", "application/json"): diff_to_structured_hunks,
}


# --------------------------------------------------------------------------- #
def adapt(parts: list[Part], accepts: list[str], ctx: Any) -> list[Part]:
    """Return parts the recipient can actually ingest, converting where needed."""
    adapters_cfg = getattr(ctx.cfg.a2a, "adapters", {}) if ctx else {}
    out: list[Part] = []
    for p in parts:
        if matches(p.mime_type, accepts):
            out.append(p)
            continue
        for target in accepts:
            key = f"{p.mime_type}->{target}"
            entry = adapters_cfg.get(key)
            fn = ADAPTERS.get((p.mime_type, target))
            if fn and (entry is None or entry.enabled):
                out.append(fn(p, ctx))
                break
        else:
            raise UnsupportedModality(p.mime_type, accepts)
    return out


def summarise(parts: list[Part]) -> str:
    """One-line description of a payload, for logs and journal entries."""
    bits = []
    for p in parts:
        if isinstance(p, JsonPart):
            bits.append(p.schema_id)
        elif isinstance(p, BlobPart):
            bits.append(f"{p.modality.value}:{p.uri.rsplit('/', 1)[-1]}")
        else:
            bits.append(f"text[{len(p.text)}]")
    return ", ".join(bits) or "empty"
