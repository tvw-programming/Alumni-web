"""Paid tier: Claude API."""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


class AnthropicBackend(BaseBackend):
    tier = "paid_api"

    def _model(self, **params: Any):
        try:
            from langchain_anthropic import ChatAnthropic
        except ImportError as exc:  # pragma: no cover
            raise BackendError("pip install 'codegen_core[anthropic]' to use the anthropic driver") from exc
        key = os.getenv(self.cfg.auth.token_env or "ANTHROPIC_API_KEY")
        if not key:
            raise BackendError(f"backend {self.id}: {self.cfg.auth.token_env} is unset")
        return ChatAnthropic(model=self.model_id, api_key=key, **params)

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        resp = self._model(**params).invoke([("system", system), ("human", user)])
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(
            resp.content, meta.get("input_tokens", 0), meta.get("output_tokens", 0), resp
        )

    def describe_image(self, path: Path) -> str:
        data = base64.b64encode(Path(path).read_bytes()).decode()
        model = self._model()
        resp = model.invoke(
            [
                (
                    "human",
                    [
                        {"type": "image", "source": {"type": "base64",
                                                     "media_type": "image/jpeg", "data": data}},
                        {"type": "text", "text": "Describe this screenshot for a developer "
                                                 "debugging a failed test. Be specific."},
                    ],
                )
            ]
        )
        return resp.content
