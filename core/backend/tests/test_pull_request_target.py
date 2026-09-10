"""Which repository step 22 opens its pull request against.

The repository the pipeline *edits* (`app.project.path`) and the repository the
change is *proposed to* are separate decisions. These pin the second one to
config, including the cross-repository case where the branch lives somewhere
other than the target.
"""

from __future__ import annotations

from types import SimpleNamespace

from codegen_core.plugins.vcs_github import GitHubPlugin


def plugin(**overrides) -> GitHubPlugin:
    cfg = SimpleNamespace(driver="github", repo="acme/canonical", dry_run=True, **overrides)
    return GitHubPlugin(cfg, None)


def test_the_target_repo_comes_from_config():
    assert plugin().target_repo() == "acme/canonical"


def test_a_same_repo_branch_stays_a_bare_branch():
    """The shape this sent before `head_repo` existed, unchanged."""
    assert plugin().head_ref("codegen/DEEP-1042-export") == "codegen/DEEP-1042-export"


def test_a_branch_in_another_repo_is_qualified_with_its_owner():
    """GitHub expects `owner:branch` when the head is outside the target repo."""
    vcs = plugin(head_repo="contractor/fork")

    assert vcs.head_ref("codegen/DEEP-1042-export") == "contractor:codegen/DEEP-1042-export"


def test_naming_the_target_as_the_head_repo_is_not_cross_repo():
    """Same repo written two ways is still one repo; do not qualify it."""
    vcs = plugin(head_repo="acme/canonical")

    assert vcs.head_ref("codegen/DEEP-1042") == "codegen/DEEP-1042"


def test_the_base_branch_is_configurable_and_defaults_to_main():
    assert plugin().base_branch() == "main"
    assert plugin(base_branch="develop").base_branch() == "develop"


def test_an_enterprise_host_is_honoured():
    """The old code hard-coded api.github.com and ignored configured base_url."""
    vcs = plugin(base_url="https://github.acme.internal/api/v3/")

    assert vcs._api_root() == "https://github.acme.internal/api/v3"


def test_the_pull_request_records_where_it_was_opened():
    pr = plugin(head_repo="contractor/fork", base_branch="develop").open_pull_request(
        title="DEEP-1042: export", body="", head="codegen/DEEP-1042"
    )

    assert pr["repo"] == "acme/canonical"
    assert pr["base"] == "develop"
    assert pr["head"] == "contractor:codegen/DEEP-1042"
