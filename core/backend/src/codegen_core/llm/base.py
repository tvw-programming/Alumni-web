"""LLM backend protocol.

A backend is described entirely by config.json. Code knows *drivers* (protocols),
never vendors. Adding Groq or an internal vLLM endpoint is a JSON block with
driver="openai_compatible" and a different base_url.
"""

from __future__ import annotations

import json
import re
from enum import Enum
from typing import Any, Protocol, runtime_checkable

from ..core.errors import BackendError


class Capability(str, Enum):
    FAST = "fast"
    CODING = "coding"
    REASONING = "reasoning"
    SECURITY = "security"
    VISION = "vision"


class Completion:
    """Uniform result across every driver."""

    def __init__(self, text: str, tokens_in: int = 0, tokens_out: int = 0, raw: Any = None) -> None:
        self.text = text
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out
        self.raw = raw

    @property
    def usage(self) -> dict[str, int]:
        return {"tokens_in": self.tokens_in, "tokens_out": self.tokens_out}

    JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)

    def as_json(self) -> Any:
        """Parse a JSON response, tolerating markdown fences around it."""
        body = self.text.strip()
        m = self.JSON_FENCE.search(body)
        if m:
            body = m.group(1).strip()
        start = min((i for i in (body.find("{"), body.find("[")) if i != -1), default=-1)
        if start > 0:
            body = body[start:]
        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            raise BackendError(f"model did not return valid JSON: {exc}\n---\n{self.text[:800]}")


@runtime_checkable
class LLMBackend(Protocol):
    id: str
    tier: str
    model_id: str
    capabilities: set[Capability]

    def supports(self, cap: Capability | str) -> bool: ...

    def complete(self, system: str, user: str, **kw: Any) -> Completion: ...


class BaseBackend:
    """Shared plumbing. Drivers implement _invoke()."""

    tier = "cloud"

    def __init__(self, backend_id: str, cfg: Any) -> None:
        self.id = backend_id
        self.cfg = cfg
        self.model_id = cfg.model
        self.tier = cfg.tier
        self.capabilities = {Capability(c) for c in cfg.capabilities}

    def supports(self, cap: Capability | str) -> bool:
        return Capability(cap) in self.capabilities

    def complete(self, system: str, user: str, **kw: Any) -> Completion:
        params = {**self.cfg.params, **kw}
        params.pop("workspace", None)
        return self._invoke(system, user, **params)

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:  # pragma: no cover
        raise NotImplementedError

    def describe_image(self, path: Any) -> str:
        raise BackendError(f"backend {self.id} has no vision support")

    def __repr__(self) -> str:  # pragma: no cover - display only
        return f"<{type(self).__name__} {self.id} model={self.model_id} tier={self.tier}>"
