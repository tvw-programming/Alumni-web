"""Cloud tier: any OpenAI-compatible endpoint.

Covers Together AI, vLLM, LM Studio, Groq, OpenRouter and internal gateways.
They differ only by base_url and the env var holding the token, both of which
come from config.json - so none of them needs its own module.
"""

from __future__ import annotations

import os
from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


class OpenAICompatibleBackend(BaseBackend):
    tier = "cloud"

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:  # pragma: no cover
            raise BackendError("pip install 'codegen_core[openai]' for openai_compatible") from exc
        token_env = self.cfg.auth.token_env
        key = os.getenv(token_env) if token_env else None
        if token_env and not key:
            raise BackendError(f"backend {self.id}: env var {token_env} is unset")
        model = ChatOpenAI(model=self.model_id, base_url=self.cfg.base_url, api_key=key, **params)
        resp = model.invoke([("system", system), ("human", user)])
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(
            resp.content, meta.get("input_tokens", 0), meta.get("output_tokens", 0), resp
        )
