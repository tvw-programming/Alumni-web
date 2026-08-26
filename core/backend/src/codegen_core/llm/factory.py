"""Driver registry.

Code knows six protocols. config.json names one of them per backend entry.
Adding a vendor that speaks an existing protocol requires no code at all.
"""

from __future__ import annotations

from typing import Any

from ..core.errors import ConfigError
from .backends.anthropic import AnthropicBackend
from .backends.bedrock import BedrockBackend
from .backends.cli_agent import CliAgentBackend
from .backends.mock import MockBackend
from .backends.ollama import OllamaBackend
from .backends.openai import OpenAIBackend
from .backends.openai_compatible import OpenAICompatibleBackend
from .base import BaseBackend

DRIVERS: dict[str, type[BaseBackend]] = {
    "mock": MockBackend,
    "ollama": OllamaBackend,
    "openai_compatible": OpenAICompatibleBackend,
    "bedrock": BedrockBackend,
    "anthropic": AnthropicBackend,
    "openai": OpenAIBackend,
    "cli_agent": CliAgentBackend,
}


def build_backends(cfg: Any) -> dict[str, BaseBackend]:
    out: dict[str, BaseBackend] = {}
    for bid, b in cfg.backends.items():
        if not b.enabled:
            continue
        driver = DRIVERS.get(b.driver)
        if driver is None:
            raise ConfigError(
                f"backend '{bid}': unknown driver '{b.driver}'. Known: {sorted(DRIVERS)}"
            )
        out[bid] = driver(bid, b)
    if not out:
        raise ConfigError("no enabled backends in config.json")
    return out
