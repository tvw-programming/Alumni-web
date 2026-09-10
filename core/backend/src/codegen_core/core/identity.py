"""Who started this run.

The pipeline authors git commits on a person's behalf, so it has to be able to
name that person — and a name alone is not enough, because git wants an address
and because "dashboard-user" is not somebody. One function answers the question
for both entry points, and it refuses rather than inventing a plausible author:
a commit is permanent, and an unattributable one cannot be corrected later
without rewriting history.

Two paths record a requester and they record it in different places, for
reasons that predate this module: the dashboard writes a `run_requested` journal
event, and the CLI stores `--as` inside `story_input.json`. Both are read here so
that everything downstream sees one answer.
"""

from __future__ import annotations

import re
from typing import Any

from . import story_input
from .errors import CodeGenCoreError

#: Deliberately loose. This is a sanity check against "dashboard-user", not an
#: attempt to decide which addresses exist — that is what the mail server is for.
EMAIL = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]+$")


class UnidentifiedRequester(CodeGenCoreError):
    """The run cannot name, as an email address, the person who started it."""


def is_email(value: str) -> bool:
    return bool(EMAIL.match((value or "").strip()))


def requester(ctx: Any) -> str:
    """The email of whoever started this run, or "" if none was recorded."""
    for entry in ctx.journal.entries():
        if entry.get("event") == "run_requested" and entry.get("started_by"):
            return str(entry["started_by"]).strip()

    try:
        story = story_input.load(ctx)
    except CodeGenCoreError:
        # An unreadable story input is step 01's problem to report, not this
        # function's; it simply means no requester is recorded here.
        story = None
    return (story.entered_by if story else "").strip()


def require_author(ctx: Any) -> str:
    """The requester, as a usable git author. Raises if there isn't one.

    Called before anything is committed, and — via `assert_identifiable` — at the
    start of any run that could reach a commit, so the failure lands at second
    zero rather than after twenty minutes of model spend.
    """
    who = requester(ctx)
    if not who:
        raise UnidentifiedRequester(
            "this run does not record who started it, and its commits would have "
            "no author. Start it with `codegen-core run <jira-id> --as you@example.com`, "
            "or from the dashboard, which asks."
        )
    if not is_email(who):
        raise UnidentifiedRequester(
            f"'{who}' is not an email address, and git commits need one. "
            "Start the run with `--as you@example.com`."
        )
    return who


def author_for(ctx: Any) -> tuple[str, str]:
    """(name, email) for git. The local part stands in for a display name."""
    email = require_author(ctx)
    return email.split("@", 1)[0], email


def can_publish(cfg: Any) -> bool:
    """Could this run reach a real commit and push?

    A run with no target repository or no token produces a dry-run pull request
    and writes nothing to git, so it has nobody to attribute and needs none. The
    identity requirement therefore applies exactly where a commit can happen —
    which is why the offline profile still runs with no arguments.
    """
    import os

    entry = cfg.plugins.get("vcs")
    if entry is None or getattr(entry, "dry_run", False):
        return False
    repo = (getattr(entry, "repo", "") or "").strip()
    token_env = (getattr(entry, "auth", {}) or {}).get("token_env", "GITHUB_TOKEN")
    return bool(repo) and bool(os.getenv(token_env, ""))


def assert_identifiable(cfg: Any, ctx: Any) -> None:
    """Fail a publishing run at the start if it cannot name its author."""
    if can_publish(cfg):
        require_author(ctx)
