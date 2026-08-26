"""Cloud tier: AWS Bedrock (Converse API)."""

from __future__ import annotations

from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


class BedrockBackend(BaseBackend):
    tier = "cloud"

    def _invoke(self, system: str, user: str, **params: Any) -> Completion:
        try:
            from langchain_aws import ChatBedrockConverse
        except ImportError as exc:  # pragma: no cover
            raise BackendError("pip install 'codegen_core[bedrock]' to use the bedrock driver") from exc
        model = ChatBedrockConverse(
            model=self.model_id, region_name=self.cfg.region, **params
        )
        resp = model.invoke([("system", system), ("human", user)])
        meta = getattr(resp, "usage_metadata", None) or {}
        return Completion(
            resp.content, meta.get("input_tokens", 0), meta.get("output_tokens", 0), resp
        )
