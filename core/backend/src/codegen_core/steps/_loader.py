"""Step discovery.

Python cannot `import 01_jira_story_extraction` - a module name may not start
with a digit. The numeric prefix is preserved on disk (it is the whole point of
the convention) and modules are loaded by path instead, registered under an
import-safe alias `codegen_core.steps.step_01_jira_story_extraction`.

Each step file must export exactly one object named STEP, whose .step attribute
matches its filename prefix. A mismatch is a hard error - a silently misnumbered
step would corrupt artifact names and the journal.

Files are grouped into one directory per pipeline phase - requirements, design,
build, validate, publish, gates - matching PHASES in dashboard/presenter.py and
the phase stepper in the UI. Discovery is recursive and ordering comes from the
numeric prefix alone, so which directory a step sits in is presentation only:
moving a file between phases changes nothing about how it runs. The alias each
module is registered under is unchanged by the nesting, which is why the step
files' relative imports still resolve against codegen_core.steps.
"""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path
from typing import Any

from ..core.component import Component
from ..core.errors import ConfigError

STEP_RE = re.compile(r"^(\d{2})_([a-z0-9_]+)\.py$")
STEPS_DIR = Path(__file__).parent


def load_steps(cfg: Any, steps_dir: Path | None = None) -> dict[int, Component]:
    steps_dir = steps_dir or STEPS_DIR
    registry: dict[int, Component] = {}

    # Resolve the whole file set before loading any of it. One flat directory
    # made a duplicate step number impossible; phase directories do not, and two
    # files claiming step 12 would leave whichever sorted last silently in charge
    # of the run. Checking upfront also means the clash is reported as a clash,
    # rather than as whatever error the first of the two happens to raise.
    by_number: dict[int, Path] = {}
    for path in sorted(steps_dir.rglob("[0-9][0-9]_*.py"), key=lambda p: p.name):
        if not STEP_RE.match(path.name):
            raise ConfigError(f"step file violates the naming convention: {path.name}")
        num = int(path.name[:2])
        if num in by_number:
            first = by_number[num]
            raise ConfigError(
                f"step {num:02d} is defined twice: {first.parent.name}/{first.name} "
                f"and {path.parent.name}/{path.name}"
            )
        by_number[num] = path

    for num, path in sorted(by_number.items()):
        m = STEP_RE.match(path.name)
        assert m is not None  # every path was matched above
        slug = m.group(2)

        step_cfg = cfg.steps.get(f"{num:02d}")
        if step_cfg is None:
            raise ConfigError(f"{path.name} has no entry in config.steps")
        if not step_cfg.enabled:
            continue

        mod_name = f"codegen_core.steps.step_{m.group(1)}_{slug}"
        spec = importlib.util.spec_from_file_location(mod_name, path)
        if spec is None or spec.loader is None:  # pragma: no cover
            raise ConfigError(f"could not load {path}")
        mod = importlib.util.module_from_spec(spec)
        sys.modules[mod_name] = mod
        spec.loader.exec_module(mod)

        step = getattr(mod, "STEP", None)
        if step is None:
            raise ConfigError(f"{path.name} must export a STEP object")
        if step.step != num:
            raise ConfigError(f"{path.name} exports STEP with step={step.step}, expected {num}")
        if step.kind.value.lower() != step_cfg.component:
            raise ConfigError(
                f"{path.name} is a {step.kind.value} but config.steps says '{step_cfg.component}'"
            )
        registry[num] = step

    missing = [g for g in ("06", "24") if int(g) not in registry]
    if missing:
        raise ConfigError(f"mandatory human gates missing from the registry: {missing}")
    return registry


def describe_steps(registry: dict[int, Component]) -> list[dict]:
    return [registry[k].describe() for k in sorted(registry)]
