"""Paid tier: OpenAI API."""

from __future__ import annotations

import os
from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


class OpenAIBackend(BaseBackend):
    tier = "paid_api"

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:  # pragma: no cover
            raise BackendError("pip install 'codegen_core[openai]' to use the openai driver") from exc
        key = os.getenv(self.cfg.auth.token_env or "OPENAI_API_KEY")
        if not key:
            raise BackendError(f"backend {self.id}: {self.cfg.auth.token_env} is unset")
        resp = ChatOpenAI(model=self.model_id, api_key=key, **params).invoke(
            [("system", system), ("human", user)]
        )
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(
            resp.content, meta.get("input_tokens", 0), meta.get("output_tokens", 0), resp
        )
