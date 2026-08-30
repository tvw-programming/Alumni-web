"""All CodeGen Core exceptions. Kept in one place so callers can catch by family."""


class CodeGenCoreError(Exception):
    """Base for everything this package raises."""


class ConfigError(CodeGenCoreError):
    """config.json is malformed, incomplete, or violates a safety invariant."""


class PolicyViolation(CodeGenCoreError):
    """An agent tried to do something policy forbids (write outside whitelist, etc)."""


class BackendError(CodeGenCoreError):
    """An LLM backend failed or is misconfigured."""


class GatewayUnavailable(CodeGenCoreError):
    """The MCP gateway could not be reached.

    Distinct from PolicyViolation: that means policy refused the request, this
    means we do not know what policy would have said. The run halts either way,
    but only one of them is a decision.
    """


class UnsupportedModality(CodeGenCoreError):
    """A2A part could not be adapted to anything the recipient accepts."""

    def __init__(self, mime: str, accepts: list[str]) -> None:
        super().__init__(f"cannot adapt {mime} to any of {accepts}")


class ArtifactError(CodeGenCoreError):
    """Artifact naming/extension rule violated, or checksum mismatch."""


class DocumentRejected(CodeGenCoreError):
    """A human-supplied document cannot stand in for the one it replaces.

    Unreadable bytes, an extension the gate does not accept, or a body that
    does not parse into the schema the rest of the pipeline traces against.
    The message is shown to the person who uploaded it, so it says what to fix.
    """


class RevisionNotAllowed(CodeGenCoreError):
    """A replacement document was offered where the gate state does not permit one."""


class StepError(CodeGenCoreError):
    """A step failed in a way the runner should treat as a step failure."""

    def __init__(self, step: int, message: str, status: str = "FAILED") -> None:
        super().__init__(f"step {step:02d}: {message}")
        self.step = step
        self.status = status


class PipelineHalted(CodeGenCoreError):
    """Runner stopped: no remediation edge, loop budget exhausted, or gate rejected."""

    def __init__(self, step: int, reason: str) -> None:
        super().__init__(f"pipeline halted at step {step:02d}: {reason}")
        self.step = step
        self.reason = reason


class BudgetExceeded(CodeGenCoreError):
    """Token or dollar budget from config.routing.budgets was exhausted."""
