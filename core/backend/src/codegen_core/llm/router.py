"""Model routing.

Resolves capability -> backend for a given step, honouring per-step overrides,
fallback chains, and the reviewer-isolation rule that stops a model approving
its own code.

Isolation works off the journal: "which model id executed step 12?" If step 23
would resolve to that same model, the router walks the fallback chain until it
finds a different one.
"""

from __future__ import annotations

from typing import Any

from ..core.errors import ConfigError
from .base import BaseBackend, Capability, Completion


class LLMRouter:
    def __init__(self, cfg: Any, backends: dict[str, BaseBackend], journal: Any) -> None:
        self.cfg = cfg
        self.backends = backends
        self.journal = journal

    # ------------------------------------------------------------------ #
    def backend_for(self, step: int) -> BaseBackend:
        route = self.cfg.route(step)
        cap = route.capability
        bid = route.backend or self.cfg.routing.defaults.get(cap)
        if bid is None or bid not in self.backends:
            raise ConfigError(f"step {step:02d}: no enabled backend for capability '{cap}'")
        backend = self.backends[bid]

        for rule in self.cfg.routing.isolation:
            if step in rule.reviewer_steps:
                used = {self.journal.model_used(s) for s in rule.must_differ_from}
                used.discard(None)
                if backend.model_id in used:
                    backend = self._fallback(cap, exclude_models=used, rule_id=rule.rule_id)
        return backend

    def _fallback(self, cap: str, exclude_models: set[str], rule_id: str) -> BaseBackend:
        for bid in self.cfg.routing.fallback_chains.get(cap, []):
            b = self.backends.get(bid)
            if b and b.model_id not in exclude_models:
                return b
        raise ConfigError(
            f"isolation rule '{rule_id}': no fallback backend for '{cap}' differs from {exclude_models}"
        )

    def model_for_capability(self, cap: str) -> BaseBackend | None:
        bid = self.cfg.routing.defaults.get(cap)
        b = self.backends.get(bid) if bid else None
        if b and b.supports(cap):
            return b
        return next((x for x in self.backends.values() if x.supports(cap)), None)

    # ------------------------------------------------------------------ #
    def complete(self, step: int, system: str, user: str, **kw: Any) -> tuple[Completion, BaseBackend]:
        """Run one completion for a step, retrying down the fallback chain."""
        backend = self.backend_for(step)
        params = {**self.cfg.route(step).params, **kw}
        tried: list[str] = []
        chain = [backend] + [
            self.backends[b]
            for b in self.cfg.routing.fallback_chains.get(self.cfg.route(step).capability, [])
            if b in self.backends and self.backends[b] is not backend
        ]
        last: Exception | None = None
        for b in chain:
            try:
                return b.complete(system, user, **params), b
            except Exception as exc:  # noqa: BLE001 - fall through to next backend
                tried.append(f"{b.id}: {exc}")
                last = exc
        raise ConfigError(f"step {step:02d}: every backend failed -> {tried}") from last

    def explain(self, step: int) -> dict[str, Any]:
        b = self.backend_for(step)
        route = self.cfg.route(step)
        return {
            "step": f"{step:02d}", "capability": route.capability, "backend": b.id,
            "driver": b.cfg.driver, "tier": b.tier, "model": b.model_id,
            "params": {**b.cfg.params, **route.params},
            "cost_per_1k_usd": b.cfg.cost_per_1k_usd,
        }
