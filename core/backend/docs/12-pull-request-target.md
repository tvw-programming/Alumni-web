# Which repository the pull request goes to

Step 22 opens the pull request against `plugins.vcs.repo`. That is a separate
decision from `app.project.path`, which is the checkout the pipeline *edits* —
so a deployment can edit a working copy and propose the change to a different,
canonical repository.

```json
"vcs": {
  "driver": "github",
  "base_url": "https://api.github.com",
  "repo": "acme/canonical",          // the PR is opened HERE
  "head_repo": "",                    // where the branch lives, if not `repo`
  "base_branch": "main",              // what the PR is proposed onto
  "branch_template": "codegen/{jira_id}-{slug}",
  "draft_pr": true
}
```

| Key | Meaning |
| --- | --- |
| `repo` | `owner/name` of the repository the PR is opened against. Empty disables the API call and step 22 returns a dry-run PR. |
| `head_repo` | `owner/name` of the repository the branch lives in. Leave empty for the ordinary same-repo PR. Setting it to something other than `repo` makes the head `owner:branch`, which is how GitHub expresses a fork PR. |
| `base_branch` | The branch the change is proposed onto. Defaults to `main`. |
| `base_url` | API root. Point it at `https://github.example/api/v3` for GitHub Enterprise. |
| `branch_template` | Branch name, from `{jira_id}` and `{slug}`. |
| `draft_pr` | Open as a draft. The PR becomes a merge candidate only after gate 24. |

Any of these may be written literally or read from the environment with
`${env:NAME:-default}`. The shipped config uses `${env:TARGET_REPO:-}` so a
deployment can set it without editing the file; replacing that with a literal
`"acme/canonical"` is equally valid and is the clearer choice when the target
never changes.

## How the branch gets there

A run no longer edits `app.project.path` directly. It **clones** it to
`app.paths.workspace/{job_id}` and works in the clone, checked out on
`base_branch`. Two runs can then never collide in one tree, each starts from a
clean base, and the project checkout is only ever read. Set
`app.project.isolate_per_run` to `false` for the older in-place behaviour;
cloning is skipped anyway when `path` is empty or is not a git repository.

Step 22 then, in order:

1. Puts the tree on the run's branch (`branch_template`), carrying the
   uncommitted work across. The branch is created here rather than at start-up
   because its name contains the feature slug, which only exists after step 05.
2. Stages **exactly** the files in `CodeChangesetV1` — never `git add -A`. Each
   is re-checked against step 09's `allowed_paths` first, and a path outside it
   halts the run without committing. This is the backstop for `cli_agent`
   backends that write to disk themselves and bypass `GuardedFS`.
3. Commits as the person who started the run, and fills `CodeChangesetV1.commits`.
4. Pushes to `head_repo` (or `repo`), **refusing if the branch already exists**
   rather than overwriting work somebody pushed by hand.
5. Opens the pull request from that branch onto `base_branch`.

A failed push halts. It does not fall through to GitHub answering 422 about a
head that does not exist, which is what happened before any of this existed.

### Branch names and re-runs

`branch_template` accepts `{jira_id}`, `{slug}` and `{job_id}`. Because a push
refuses to overwrite, a template built only from the story produces the same
branch on every re-run, and the second run of a story halts. `{job_id}` already
contains the story number, so `"codegen/{job_id}"` gives a unique branch per run
and still reads as the ticket. Use `"{jira_id}"` only where one branch per story
is what you want, and expect to delete it between runs.

### Who the commits belong to

The author is whoever started the run, and it must be an **email address**:
`codegen-core run <id> --as you@example.com`, or the dashboard's start dialog.

That is required only when the run could actually publish — `repo` set *and* a
token present. A run that can only produce a dry-run pull request commits
nothing, so it has nobody to attribute, which is why the offline pipeline still
runs with no arguments:

```bash
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
```

The check happens at start-up rather than at step 22, so an unattributable run
fails in the first second instead of after paying for twenty steps of model
calls.

## What this still does not do

**Merge conflicts.** The clone is fresh from `base_branch`, so a run cannot
conflict with itself; a base that moved under a long run will, and that surfaces
as a rejected non-fast-forward at push time.

**Cleaning up the clone.** `retention_days.workspace` governs how long it
survives; nothing deletes it at the end of a run.
