"""GitHub adapter (step 22) plus local git helpers used by step 12.

The repository a pull request is opened against is config's decision, not the
checkout's: `plugins.vcs.repo` names the target, `head_repo` names where the
branch lives when that is somewhere else, and `base_branch` names what it is
proposed onto. See `docs/12-pull-request-target.md`.
"""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from pathlib import Path
from typing import Any

from ..core.errors import VcsError
from ..tools.diff_tools import changed_loc, git_diff, parse_porcelain, repo_scope
from .base import BasePlugin


class GitHubPlugin(BasePlugin):
    capability = "vcs"
    driver = "github"

    # -------------------------- local git ----------------------------- #
    def snapshot_changes(self, workspace: Path) -> dict:
        """Structured view of the working tree, used to build CodeChangesetV1.

        Everything after step 12 traces to this: step 13 reviews it, step 22
        commits it, and a human approves it at gate 24. So it reports what
        changed *in this workspace* and nothing else — never the contents of a
        repository that merely happens to contain it.

        A workspace that is not in a repository at all yields an empty
        changeset, which is the truth. Step 12 then falls back to GuardedFS's
        own record of what it wrote, which is a better answer than git's anyway.
        """
        root, prefix = repo_scope(workspace)
        if root is None:
            return {
                "changed_files": [], "created_files": [], "changed_loc": 0,
                "commits": [], "unified_diff": "",
                "repo_root": "", "workspace_is_repo_root": False,
            }

        diff = git_diff(workspace)
        changed: list[str] = []
        created: list[str] = []
        try:
            proc = subprocess.run(
                # -z: NUL-separated, so a path containing a space or a quote
                #     survives. -uall: list untracked *files*, not the
                #     directories that contain them. `-- .`: this subtree only.
                ["git", "status", "--porcelain", "-z", "--untracked-files=all", "--", "."],
                cwd=workspace, capture_output=True, text=True, timeout=120,
            )
            if proc.returncode == 0:
                changed, created = parse_porcelain(proc.stdout, prefix)
        except (FileNotFoundError, subprocess.TimeoutExpired, NotADirectoryError):
            pass

        return {
            "changed_files": changed,
            "created_files": created,
            "changed_loc": changed_loc(diff),
            "commits": [],
            "unified_diff": diff,
            # Recorded so a reader of the artifact can see which repository
            # answered, rather than having to assume it was the right one.
            "repo_root": str(root),
            "workspace_is_repo_root": root == Path(workspace).resolve(),
        }

    def branch_name(self, jira_id: str, slug: str, job_id: str = "") -> str:
        """The run's branch.

        `{job_id}` is offered alongside `{jira_id}` and `{slug}` because a push
        refuses to overwrite an existing branch: a template built only from the
        story produces the same name on every re-run, and the second run of a
        story would then halt. Including the job id makes each run unique.
        """
        template = getattr(self.cfg, "branch_template", "codegen/{jira_id}-{slug}")
        return template.format(jira_id=jira_id, slug=slug, job_id=job_id)

    # -------------------------- publication --------------------------- #
    def _git(self, argv: list[str], cwd: Path, timeout: int = 300) -> subprocess.CompletedProcess:
        """Run one git command, raising with git's own words when it fails."""
        proc = subprocess.run(
            ["git", *argv], cwd=cwd, capture_output=True, text=True, timeout=timeout
        )
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout or "").strip()
            raise VcsError(f"git {' '.join(argv)} failed: {detail}")
        return proc

    def _remote_url(self, repo: str, token: str) -> str:
        """An HTTPS remote carrying the token in the credential position.

        The token never reaches disk: this string is passed to git as an
        argument for a single command and is scrubbed before anything it appears
        in is raised or logged. A remote is not added to the clone's config for
        the same reason.
        """
        host = self._api_root().replace("https://", "").replace("http://", "")
        host = "github.com" if host.startswith("api.github.com") else host.split("/")[0]
        return f"https://x-access-token:{token}@{host}/{repo}.git"

    @staticmethod
    def _scrub(text: str, token: str) -> str:
        return text.replace(token, "***") if token else text

    @staticmethod
    def is_repo(path: Path) -> bool:
        return (path / ".git").exists()

    def prepare_worktree(self, source: Path, destination: Path, *, base: str = "") -> dict:
        """Clone `source` to `destination` and check out the base branch.

        A run gets its own tree so two runs cannot edit one checkout, and so it
        starts from a known-clean base rather than whatever the last run left
        behind. The clone is local, so it is a hardlink copy, not a fetch.

        The run's *branch* is not created here. Its name contains the feature
        slug, which comes from the BRD at step 05 and does not exist yet at
        start-up; `publish_branch` creates it, which is fine because `checkout
        -b` carries the uncommitted work across.
        """
        base = base or self.base_branch()
        if self.is_repo(destination):
            # Resuming into a tree this run already prepared. Leave it exactly
            # as it is: it holds the work of every step that has already run.
            return {"path": str(destination), "base": base, "reused": True}

        destination.parent.mkdir(parents=True, exist_ok=True)
        self._git(["clone", "--local", str(source), str(destination)], destination.parent)
        # A base that does not exist is worth saying plainly. Falling back to
        # whatever HEAD points at is how a run ends up branching from somebody
        # else's feature branch.
        try:
            self._git(["checkout", base], destination)
        except VcsError as exc:
            raise VcsError(
                f"base branch '{base}' does not exist in {source}. Set "
                f"plugins.vcs.base_branch to a branch that does."
            ) from exc
        return {"path": str(destination), "base": base, "reused": False}

    def start_branch(self, workspace: Path, branch: str) -> None:
        """Put the working tree on the run's branch, keeping uncommitted work.

        Idempotent, because step 22 can be retried: an existing local branch is
        checked out rather than re-created.
        """
        existing = subprocess.run(
            ["git", "rev-parse", "--verify", f"refs/heads/{branch}"],
            cwd=workspace, capture_output=True, text=True, timeout=60,
        )
        create = [] if existing.returncode == 0 else ["-b"]
        self._git(["checkout", *create, branch], workspace)

    def branch_exists_on_remote(self, branch: str, repo: str, token: str,
                                cwd: Path) -> bool:
        url = self._remote_url(repo, token)
        proc = subprocess.run(
            ["git", "ls-remote", "--heads", url, f"refs/heads/{branch}"],
            cwd=cwd, capture_output=True, text=True, timeout=120,
        )
        if proc.returncode != 0:
            raise VcsError(
                f"could not reach {repo}: {self._scrub((proc.stderr or '').strip(), token)}"
            )
        return bool(proc.stdout.strip())

    def publish_branch(self, workspace: Path, *, branch: str, paths: list[str],
                       message: str, author: tuple[str, str]) -> dict:
        """Commit the named paths and push the branch.

        Only `paths` are staged. Committing the whole tree would sweep in
        anything a `cli_agent` backend wrote outside GuardedFS, and the caller
        has already checked these against the write scope.
        """
        repo = (getattr(self.cfg, "head_repo", "") or "").strip() or self.target_repo()
        token = os.getenv(
            (getattr(self.cfg, "head_token_env", "") or "").strip()
            or (getattr(self.cfg, "auth", {}) or {}).get("token_env", "GITHUB_TOKEN"),
            "",
        )
        if self.dry_run or not repo or not token:
            return {"branch": branch, "sha": "", "repo": repo, "pushed": False,
                    "dry_run": True, "files": list(paths)}

        if not paths:
            raise VcsError("nothing to commit: the changeset names no files")
        if not self.is_repo(workspace):
            raise VcsError(
                f"{workspace} is not a git repository, so there is nothing to push. "
                "Point app.project.path at a checkout, or leave plugins.vcs.repo "
                "empty to keep producing dry-run pull requests."
            )
        if self.branch_exists_on_remote(branch, repo, token, workspace):
            raise VcsError(
                f"branch '{branch}' already exists in {repo}. This run will not "
                "overwrite it — delete it, or set plugins.vcs.branch_template to "
                "include {job_id} so each run gets its own branch."
            )

        name, email = author
        self.start_branch(workspace, branch)
        self._git(["add", "--", *paths], workspace)
        staged = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=workspace, capture_output=True, text=True, timeout=60,
        )
        if staged.returncode == 0:
            # git would say "nothing to commit, working tree clean", which sends
            # the reader looking at git rather than at the changeset that lied.
            raise VcsError(
                "the changeset names files that hold no change: "
                + ", ".join(paths)
                + ". Nothing was committed."
            )
        self._git(
            ["-c", f"user.name={name}", "-c", f"user.email={email}",
             "commit", "-m", message, "--author", f"{name} <{email}>"],
            workspace,
        )
        sha = self._git(["rev-parse", "HEAD"], workspace).stdout.strip()

        url = self._remote_url(repo, token)
        proc = subprocess.run(
            ["git", "push", url, f"{branch}:refs/heads/{branch}"],
            cwd=workspace, capture_output=True, text=True, timeout=600,
        )
        if proc.returncode != 0:
            raise VcsError(
                f"push to {repo} failed: "
                f"{self._scrub((proc.stderr or proc.stdout or '').strip(), token)}"
            )
        return {"branch": branch, "sha": sha, "repo": repo, "pushed": True,
                "dry_run": False, "files": list(paths)}

    # ---------------------------- remote ------------------------------ #
    def target_repo(self) -> str:
        """The repository the pull request is opened *against*.

        Config decides this, not the checkout: the repository the pipeline edits
        (`app.project.path`) and the repository the change is proposed to are
        allowed to be different things — a fork raising upstream, or a build
        that edits a working copy and publishes to a canonical repo.
        """
        return (getattr(self.cfg, "repo", "") or "").strip()

    def head_ref(self, branch: str) -> str:
        """The `head` GitHub expects, cross-repository aware.

        A pull request whose branch lives outside the target repository has to
        name the owner it lives under — `owner:branch` — which is how GitHub
        expresses a fork PR. Same-repo PRs pass the bare branch, so setting
        `head_repo` is what switches the behaviour, and leaving it unset keeps
        exactly the shape this sent before.
        """
        head_repo = (getattr(self.cfg, "head_repo", "") or "").strip()
        if not head_repo or head_repo == self.target_repo():
            return branch
        owner = head_repo.split("/")[0]
        return f"{owner}:{branch}"

    def base_branch(self) -> str:
        """The branch the change is proposed onto. Was hard-coded to `main`."""
        return (getattr(self.cfg, "base_branch", "") or "main").strip()

    def _api_root(self) -> str:
        """`api.github.com` unless config names an Enterprise host."""
        return (getattr(self.cfg, "base_url", "") or "https://api.github.com").rstrip("/")

    def open_pull_request(
        self, *, title: str, body: str, head: str, base: str | None = None
    ) -> dict:
        repo = self.target_repo()
        base = (base or self.base_branch()).strip()
        head = self.head_ref(head)
        token = os.getenv("GITHUB_TOKEN", "")
        if self.dry_run or not repo or not token:
            return {
                "number": 0, "url": f"https://github.com/{repo or 'dry-run'}/pull/0",
                "head": head, "base": base, "draft": True, "dry_run": True,
                "title": title, "repo": repo,
            }
        payload = json.dumps(
            {"title": title, "body": body, "head": head, "base": base,
             "draft": bool(getattr(self.cfg, "draft_pr", True))}
        ).encode()
        req = urllib.request.Request(
            f"{self._api_root()}/repos/{repo}/pulls",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = json.loads(resp.read())
        return {"number": data.get("number"), "url": data.get("html_url"),
                "head": head, "base": base, "draft": data.get("draft", False),
                "repo": repo}

    def merge(self, pr_number: int) -> dict:
        """Only ever called after gate 24 records an APPROVED decision."""
        if self.dry_run or not pr_number:
            return {"merged": True, "dry_run": True, "sha": "0" * 40, "repo": self.target_repo()}
        return {"merged": False, "reason": "merge requires an explicit human action in this build"}
