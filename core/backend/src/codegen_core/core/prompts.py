"""Prompt loading.

Prompt *text* lives in config/prompts/*.md, not in config.json - multi-line
markdown inside JSON is unreviewable. config.json stores only the filename, so a
profile can swap prompt variants without touching code.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .errors import ConfigError


class PromptLibrary:
    def __init__(self, root: str | Path, redaction_patterns: list[str] | None = None) -> None:
        self.root = Path(root)
        self._patterns = [re.compile(p) for p in (redaction_patterns or [])]
        self._cache: dict[str, str] = {}

    def load(self, filename: str | None, **fmt: Any) -> str:
        if not filename:
            raise ConfigError("step has no prompt configured")
        if filename not in self._cache:
            path = self.root / filename
            if not path.exists():
                raise ConfigError(f"prompt not found: {path}")
            self._cache[filename] = path.read_text()
        body = self._cache[filename]
        return body.format(**fmt) if fmt else body

    def redact(self, text: str) -> str:
        """Strip anything matching config.secrets.redaction.patterns before persisting."""
        for pat in self._patterns:
            text = pat.sub("[REDACTED]", text)
        return text
