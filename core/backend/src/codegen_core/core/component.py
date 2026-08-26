"""Component base classes.

A workflow step is not necessarily an agent. Four kinds:

  AGENT   LLM reasoning. Non-deterministic. Needs a prompt, a model, a rubric.
  TOOL    Deterministic Python. No LLM. Also exposable to agents via @tool.
  PLUGIN  Adapter to an external system. Vendor chosen in config.plugins.
  GATE    Human-in-the-loop control point. Blocks the runner.

Every component has exactly one entry point: handle(envelope, ctx) -> envelope.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from .envelope import ComponentRef, Envelope


class Kind(str, Enum):
    AGENT = "AGENT"
    TOOL = "TOOL"
    PLUGIN = "PLUGIN"
    GATE = "GATE"


class Component(ABC):
    step: int | None = None
    name: str = ""
    kind: Kind = Kind.TOOL
    category: str = ""
    version: str = "1.0.0"

    #: schema ids this component needs from earlier steps
    consumes: list[str] = []
    #: schema ids / artifact slugs this component emits
    produces: list[str] = []
    #: mime types this component can ingest; negotiate.adapt() honours it
    accepts: list[str] = ["*/*"]

    def ref(self) -> ComponentRef:
        return ComponentRef(step=self.step, name=self.name, kind=self.kind.value, version=self.version)

    def describe(self) -> dict[str, Any]:
        return {
            "step": self.step, "name": self.name, "kind": self.kind.value,
            "category": self.category, "consumes": self.consumes, "produces": self.produces,
        }

    @abstractmethod
    def handle(self, env: Envelope, ctx: Any) -> Envelope: ...

    def rehydrate(self, payload: dict, ctx: Any) -> None:
        """Re-apply what running this step did to the context, without running it.

        `handle` usually leaves the context exactly one thing: the typed payload,
        which the runner restores from the artifact. A step that sets anything
        else — step 09 and its Impact Manifest — has to say so here, or a run
        that resumes in a fresh process, retries a later step, or skips this one
        as already-done for the story will find that state missing and fail a
        precondition it should have satisfied.

        Deliberately narrow: this puts state back, it does not do work. Anything
        that costs a token or writes a file belongs in `handle`.
        """
        return None


class Agent(Component):
    kind = Kind.AGENT
    capability: str = "reasoning"


class Tool(Component):
    kind = Kind.TOOL


class Plugin(Component):
    kind = Kind.PLUGIN


class Gate(Component):
    kind = Kind.GATE
    required_roles: list[str] = []
