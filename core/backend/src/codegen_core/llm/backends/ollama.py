"""Local tier: Ollama."""

from __future__ import annotations

from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


class OllamaBackend(BaseBackend):
    tier = "local"

    def _client(self):
        try:
            from langchain_ollama import ChatOllama
        except ImportError as exc:  # pragma: no cover
            raise BackendError("pip install 'codegen_core[ollama]' to use the ollama driver") from exc
        return ChatOllama

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        ChatOllama = self._client()
        model = ChatOllama(model=self.model_id, base_url=self.cfg.base_url, **params)
        resp = model.invoke([("system", system), ("human", user)])
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(
            resp.content, meta.get("input_tokens", 0), meta.get("output_tokens", 0), resp
        )
