"""Dev-tool tier: any headless agent binary.

Cursor, GitHub Copilot CLI and Claude Code are not chat APIs - they edit files
in place. This driver describes them entirely in config.json (command, argv
template, where the result sits in the JSON output), so adding another one is a
config entry rather than a new module.

SAFETY NOTE: backends with edits_files_directly=true bypass the in-process
FileWriteGuard, because the binary touches the filesystem itself. The runner
therefore applies a post-hoc diff audit for these - see steps/12_code_update.py.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from ...core.errors import BackendError
from ..base import BaseBackend, Completion


def _jsonpath(payload: Any, expr: str) -> str:
    """Minimal $.a.b[0] resolver - enough for CLI result extraction."""
    node = payload
    for token in expr.lstrip("$").strip(".").split("."):
        if not token:
            continue
        if "[" in token:
            name, idx = token[:-1].split("[")
            node = node[name][int(idx)] if name else node[int(idx)]
        else:
            node = node[token]
    return node if isinstance(node, str) else json.dumps(node)


class CliAgentBackend(BaseBackend):
    tier = "dev_tool"

    def complete(self, system: str, user: str, **kw: Any) -> Completion:
        workspace = str(kw.pop("workspace", Path.cwd()))
        prompt = f"{system}\n\n{user}".strip()
        argv = [a.format(prompt=prompt, workspace=workspace) for a in self.cfg.argv]
        if not self.cfg.command:
            raise BackendError(f"backend {self.id}: cli_agent driver needs a 'command'")
        try:
            proc = subprocess.run(
                [self.cfg.command, *argv],
                capture_output=True, text=True,
                timeout=self.cfg.limits.timeout_s, cwd=workspace,
            )
        except FileNotFoundError as exc:
            raise BackendError(f"backend {self.id}: '{self.cfg.command}' not on PATH") from exc
        except subprocess.TimeoutExpired as exc:
            raise BackendError(f"backend {self.id}: timed out after {self.cfg.limits.timeout_s}s") from exc
        if proc.returncode != 0:
            raise BackendError(f"{self.cfg.command} exited {proc.returncode}: {proc.stderr[:2000]}")

        text = proc.stdout
        if self.cfg.result_json_path:
            try:
                text = _jsonpath(json.loads(proc.stdout), self.cfg.result_json_path)
            except (json.JSONDecodeError, KeyError, IndexError) as exc:
                raise BackendError(f"could not read {self.cfg.result_json_path} from output") from exc
        return Completion(text, tokens_in=len(prompt) // 4, tokens_out=len(text) // 4)

    @property
    def edits_files_directly(self) -> bool:
        return bool(self.cfg.edits_files_directly)
