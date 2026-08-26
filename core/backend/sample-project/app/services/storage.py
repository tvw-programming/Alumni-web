"""File storage.

The reusable component the avatar story is meant to build on. It already
handles the two things that matter: where a file lands, and what public URL
points at it. A second storage path would have to solve both again and would
drift from this one.

Development writes under `media/`; production swaps the implementation for an
object-store client behind the same three methods.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path


class LocalFileStorage:
    def __init__(self, root: str | Path | None = None, public_prefix: str = "/media") -> None:
        self.root = Path(root or os.getenv("MEDIA_ROOT", "media"))
        self.public_prefix = public_prefix.rstrip("/")
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, data: bytes) -> str:
        """Write bytes under `key` and return the public URL."""
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return self.url_for(key)

    def delete(self, key: str) -> bool:
        target = self._resolve(key)
        if not target.exists():
            return False
        target.unlink()
        return True

    def exists(self, key: str) -> bool:
        return self._resolve(key).exists()

    def url_for(self, key: str) -> str:
        return f"{self.public_prefix}/{key.lstrip('/')}"

    def clear(self) -> None:
        """Test helper. Never called from application code."""
        if self.root.exists():
            shutil.rmtree(self.root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        target = (self.root / key.lstrip("/")).resolve()
        if not str(target).startswith(str(self.root.resolve())):
            raise ValueError(f"storage key escapes the media root: {key}")
        return target


storage = LocalFileStorage()
