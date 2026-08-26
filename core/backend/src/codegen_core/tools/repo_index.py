"""Deterministic repository scanning for steps 08 and 09."""

from __future__ import annotations

import ast
import re
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".mypy_cache"}
CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go", ".rb", ".cs"}


def walk(root: Path, exts: set[str] | None = None) -> list[Path]:
    exts = exts or CODE_EXT
    return [
        p
        for p in root.rglob("*")
        if p.is_file() and p.suffix in exts and not any(d in p.parts for d in SKIP_DIRS)
    ]


def index_repo(root: Path, max_files: int = 2000) -> dict:
    root = Path(root)
    files = walk(root)[:max_files]
    modules = sorted({p.parent.relative_to(root).as_posix() for p in files if p.parent != root})
    return {
        "file_count": len(files),
        "modules": [m for m in modules if m][:80],
        "entry_points": [
            p.relative_to(root).as_posix()
            for p in files
            if p.name in ("main.py", "app.py", "index.ts", "manage.py", "__main__.py")
        ],
        "ci_jobs": [
            p.relative_to(root).as_posix()
            for p in root.rglob(".github/workflows/*.y*ml")
            if p.is_file()
        ],
        "languages": sorted({p.suffix.lstrip(".") for p in files}),
    }


def python_dependency_graph(root: Path) -> dict[str, list[str]]:
    """Intra-project import edges. Cheap, deterministic, good enough for impact analysis."""
    root = Path(root)
    graph: dict[str, list[str]] = {}
    for path in walk(root, {".py"}):
        rel = path.relative_to(root).as_posix()
        try:
            tree = ast.parse(path.read_text())
        except SyntaxError:
            continue
        edges = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                edges.append(node.module)
            elif isinstance(node, ast.Import):
                edges.extend(a.name for a in node.names)
        graph[rel] = sorted(set(edges))
    return graph


def search(root: Path, pattern: str, max_hits: int = 40) -> list[dict]:
    """Regex search across the repo - the primary tool an agent uses to orient itself."""
    rx = re.compile(pattern)
    hits: list[dict] = []
    for path in walk(Path(root)):
        try:
            for n, line in enumerate(path.read_text().splitlines(), 1):
                if rx.search(line):
                    hits.append({"file": path.as_posix(), "line": n, "text": line.strip()[:200]})
                    if len(hits) >= max_hits:
                        return hits
        except (UnicodeDecodeError, OSError):
            continue
    return hits
