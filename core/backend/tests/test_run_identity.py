"""Who the pipeline says wrote the code.

The commits step 22 pushes are authored on a person's behalf, so the run has to
be able to name that person — as an email, because git needs one and because
"dashboard-user" is not somebody. A commit is permanent and an unattributable
one cannot be fixed later without rewriting history, so this refuses rather than
inventing a plausible author.

The requirement applies exactly where a commit can happen. A run with no target
repository produces a dry-run pull request and writes nothing to git, so it has
nothing to attribute — which is what keeps the offline pipeline runnable with no
arguments at all.
"""

from __future__ import annotations

import pytest

from codegen_core.core import identity, story_input
from codegen_core.core.identity import UnidentifiedRequester


def test_a_run_nobody_claimed_has_no_requester(ctx):
    assert identity.requester(ctx) == ""


def test_the_dashboard_requester_is_read_from_the_journal(ctx):
    ctx.journal.append_event("run_requested", jira_id="DEEP-1042", started_by="dana.o@acme.com")

    assert identity.requester(ctx) == "dana.o@acme.com"


def test_the_cli_requester_is_read_from_the_story_input(ctx):
    """`codegen-core run --as` stores it here, not in the journal."""
    story_input.save(ctx, {
        "key": "DEEP-1042", "title": "Export", "acceptance_criteria": ["works"],
        "entered_by": "dana.o@acme.com",
    })

    assert identity.requester(ctx) == "dana.o@acme.com"


def test_the_journal_wins_when_both_are_present(ctx):
    story_input.save(ctx, {
        "key": "DEEP-1042", "title": "Export", "acceptance_criteria": ["works"],
        "entered_by": "typed@acme.com",
    })
    ctx.journal.append_event("run_requested", started_by="pressed@acme.com")

    assert identity.requester(ctx) == "pressed@acme.com"


def test_an_unclaimed_run_cannot_author_a_commit(ctx):
    with pytest.raises(UnidentifiedRequester, match="does not record who started it"):
        identity.require_author(ctx)


def test_the_dashboard_default_is_not_an_author(ctx):
    """"dashboard-user" is the current default and is not a person."""
    ctx.journal.append_event("run_requested", started_by="dashboard-user")

    with pytest.raises(UnidentifiedRequester, match="not an email address"):
        identity.require_author(ctx)


@pytest.mark.parametrize("value", ["dana.o", "dana@localhost", "@acme.com", "a b@acme.com", ""])
def test_things_that_are_not_email_addresses(value):
    assert identity.is_email(value) is False


@pytest.mark.parametrize("value", ["dana.o@acme.com", "d@a.co", "first+tag@sub.example.org"])
def test_things_that_are(value):
    assert identity.is_email(value) is True


def test_the_author_name_comes_from_the_local_part(ctx):
    ctx.journal.append_event("run_requested", started_by="dana.o@acme.com")

    assert identity.author_for(ctx) == ("dana.o", "dana.o@acme.com")


# --------------------------------------------------------------------------- #
# where the requirement applies
# --------------------------------------------------------------------------- #
def test_a_run_that_cannot_publish_needs_no_author(cfg, ctx, monkeypatch):
    """The shipped config leaves `repo` empty, so the offline run stays free of
    this entirely — which is why every existing test still passes."""
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)

    assert identity.can_publish(cfg) is False
    identity.assert_identifiable(cfg, ctx)  # must not raise


def test_a_run_that_can_publish_is_stopped_at_the_start(cfg, ctx, monkeypatch):
    """Failing here beats failing at step 22, after the models are paid for."""
    monkeypatch.setenv("GITHUB_TOKEN", "t0ken")
    monkeypatch.setattr(identity, "can_publish", lambda _cfg: True)

    with pytest.raises(UnidentifiedRequester):
        identity.assert_identifiable(cfg, ctx)


def test_a_claimed_publishing_run_starts(cfg, ctx, monkeypatch):
    monkeypatch.setattr(identity, "can_publish", lambda _cfg: True)
    ctx.journal.append_event("run_requested", started_by="dana.o@acme.com")

    identity.assert_identifiable(cfg, ctx)  # must not raise


# --------------------------------------------------------------------------- #
# the wire
# --------------------------------------------------------------------------- #
def test_a_publishing_deployment_refuses_an_unnamed_run(cfg, monkeypatch):
    """The dashboard's old "dashboard-user" default is not an author."""
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from codegen_core.dashboard import api as api_module

    monkeypatch.setattr(api_module.ConfigLoader, "load", lambda *a, **k: cfg)
    monkeypatch.setattr(api_module, "can_publish", lambda _cfg: True)
    client = TestClient(api_module.create_app())

    response = client.post(
        "/api/runs",
        json={"jiraId": "DEEP-2001", "title": "Export", "acceptanceCriteria": ["works"],
              "startedBy": "dashboard-user"},
    )

    assert response.status_code == 422
    assert "email" in response.json()["detail"]


def test_a_deployment_that_only_dry_runs_does_not_ask(cfg, monkeypatch):
    """The shipped config leaves `repo` empty; that path must stay frictionless."""
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from codegen_core.dashboard import api as api_module

    monkeypatch.setattr(api_module.ConfigLoader, "load", lambda *a, **k: cfg)
    monkeypatch.setattr(api_module, "can_publish", lambda _cfg: False)
    client = TestClient(api_module.create_app())

    response = client.post(
        "/api/runs",
        json={"jiraId": "DEEP-2002", "title": "Export", "acceptanceCriteria": ["works"],
              "startedBy": ""},
    )

    assert response.status_code == 201
