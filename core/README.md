# CodeGen Core

> **Canonical workspace.** All 24-step pipeline logic, tests, configuration, and
> safety contracts live here. Outer folders (`apps/`, `libraries/`, `services/`,
> `packages/`) are reserved capacity or archives — see repo-root `.workspace-root`
> and `libraries/archive/README.md`.

The 24-stage AI development workflow at the centre of this monorepo: two
mandatory human gates, plus the dashboard for watching it and deciding at those
gates. Runs natively on Apple Silicon.

Two projects:

- `backend/` — the pipeline runner, the gate API and the CLI (Python)
- `frontend/` — the run monitor dashboard (React 19 + MUI)
- `backend/sample-project/` — **the primary artifact the agent edits** (FastAPI)

From the repo root, `npm run dev:core` starts both without Docker.

---

## One command

```bash
cd core
make up
```

That builds both images, starts them, waits until they answer, and opens the
dashboard at **http://localhost:5173**.

First run takes a few minutes while base images download. After that it starts
in seconds, and sits idle: **nothing runs until you start it.** No schedule, no
webhook, no boot-time seed — the pipeline writes code, and that begins when a
developer says so.

No API keys. No accounts. No network calls to anyone. The default profile runs
every model as a deterministic mock, so the whole pipeline works offline and
costs nothing.

If you'd rather not use `make`:

```bash
./run.sh              # identical
docker compose up -d  # skips the preflight checks and the browser
```

---

## What you'll see

An empty dashboard and a **Start a run** button. Press it and fill in the story:
number, title, description and acceptance criteria — the things step 01 would
otherwise fetch from Jira. Leave the form and it fetches them instead, from the
tracker configured in `config.json`.

The run then walks steps 01 to 05 and stops at the **BRD gate** in amber,
waiting for you.

1. **Read what it produced.** Select any step to see the exact input it
   received and the output it wrote. Step 05 is the business requirements
   document — the thing you're being asked to approve.
2. **Press Approve** on the gate. Nothing implementation-related has run yet;
   that's the point of the gate.
3. **Watch it continue.** A watcher inside the container notices your decision
   and resumes the run. Steps 07 through 23 execute — test design, repo
   analysis, impact scoping, code changes, verification, the real test suite,
   security scans, the technical design document, the pull request, and an
   independent AI review.
4. **It stops again** at the merge gate. Second decision, same shape.

The dashboard polls every 10 minutes; the ring in the top bar counts down, and
the refresh button beside it fetches immediately. The whole loop takes under a
minute on the mock profile.

### Or press Reject

The run stops, and it stays stopped. There is no "try again" edge from the BRD
gate: step 05 read the same story, the same analysis and the same project
context, so asking it again produces the same document.

Approve and Reject disappear, and a single **Rerun** takes their place. It opens
a prompt for a BRD of your own — markdown, PDF or Word. The upload has to parse
into the same contract the generated one did (a document with no acceptance
criteria is refused, because every later step traces to their ids), it
supersedes the BRD you rejected rather than overwriting it, and the gate re-opens
bound to the new file's checksum. Approve that, and steps 07 onward run against
*your* document.

The same thing from a terminal:

```bash
codegen-core revise <job-id> 6 ./my-brd.md --as you --role product_owner
```

### If a step fails

It stops there. A failed step blocks everything behind it — no step past it
runs, and the header names the one holding things up. **Retry** re-runs strictly
that step from the beginning, and the run carries on from there once it clears.
Nothing else re-runs: the steps before it are finished, and their documents are
already correct.

### Running the same story twice

The second run is close to free. Every step's output is filed against the story
number and the checksum of what it was made from, so a step whose inputs have
not changed is not run again — the artifacts are copied into the new run and the
tokens are never spent. Change the story, or replace the BRD at the gate, and
everything built on it regenerates, because the checksum changed. The two human
gates are never reused: they always run, and always wait for a person.

---

## The story it's implementing

`backend/stories/DEEP-2042.md` — *Implement user profile avatar upload feature*.

Five acceptance criteria, an explicit out-of-scope list, and one unresolved
question about retention. It's written the way a decent ticket is written,
because the pipeline's output is only as good as what it's given.

To run a different one, drop a markdown file in `backend/stories/`:

```markdown
---
key: PROF-118
title: Let users delete their own account
priority: High
---

## Description
...

## Acceptance Criteria
- AC-1 ...
- AC-2 ...
```

Then `make run-story STORY=PROF-118`. A story without an
`## Acceptance Criteria` section is rejected at ingestion — the pipeline traces
every change back to a criterion, so one without them can't be verified later.

---

## The project it's changing

`backend/sample-project/` is a real FastAPI service: user profiles, an
authorisation layer, and a file-storage component the avatar feature is meant to
reuse.

```
backend/sample-project/
├── app/
│   ├── api/users.py              routes, one router per resource
│   ├── services/user_service.py  business logic and ownership checks
│   ├── services/storage.py       file storage — what DEEP-2042 should reuse
│   ├── repositories/             persistence
│   ├── models/user.py            domain model and profile response
│   └── deps.py                   request dependencies
└── tests/                        13 tests, 96% coverage
```

It's bind-mounted, so **changes the agent makes appear on your Mac** and you can
open them in your editor. It's also a git-tracked directory, so `git diff` shows
exactly what changed and `git checkout -- workspace` undoes it.

Run its tests yourself:

```bash
make test
```

### What stops it going rogue

Step 09 produces an impact manifest naming exactly which paths may change and
how many lines. Step 12 writes only through a guard that refuses anything
outside that whitelist *before bytes reach disk*. The docker profile caps it
further: 12 files, 400 lines, and `media/`, `.git/`, `.env*` and `*.pem`
denied outright.

---

## Using real models

Edit `.env`, then `make down && make up`.

| `CODEGEN_PROFILE` | What runs | Needs |
|---|---|---|
| `docker` *(default)* | Deterministic mocks | Nothing |
| `docker-ollama` | Models on your Mac | Ollama running on the host |
| `docker-cloud` | Claude and GPT | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |

For Ollama, pull the models first and leave it running on the Mac — the
container reaches it at `host.docker.internal:11434`:

```bash
ollama pull qwen2.5-coder:32b
ollama pull deepseek-r1:32b
```

Ollama runs on the host rather than in a container on purpose: that way it uses
the M4's GPU through Metal, which a Linux container cannot reach.

The cloud profile has a $5 per-job cap. The run halts and notifies rather than
quietly spending more.

---

## Commands

```
make up          build, start, open the dashboard
make logs        follow both services
make ps          service status
make down        stop, keep the run data
make clean       stop and delete the run data
make reset       clean, and restore backend/sample-project/ to its original state
make test        orchestrator suite, then the sample project's suite
make shell       bash inside the orchestrator
make gates       which gates are waiting on a human
make cli ARGS="status DEEP-2042-ab12cd"
make run-story STORY=DEEP-2042
```

---

## Layout

```
core/
├── docker-compose.yml            two services, arm64, bind mounts
├── Makefile                      the commands above
├── run.sh                        what `make up` calls
├── .env.example                  every setting, all optional
├── docker/
│   ├── backend.Dockerfile        python:3.12-slim-bookworm
│   ├── frontend.Dockerfile       node:22-bookworm-slim, dev and prod targets
│   ├── entrypoint.sh             validate → seed → serve
│   ├── gate_watcher.py           resumes the run when you decide
│   └── nginx.conf                prod target only
├── backend/                      the pipeline
│   ├── src/codegen_core/         steps, orchestrator, llm, plugins, tools
│   ├── config/config.json        models, prompts, budgets, gates
│   ├── tests/                    the orchestrator suite
│   ├── stories/DEEP-2042.md      the predefined story
│   ├── sample-project/           the project the agent edits
│   ├── artifacts/, runs/         sample run data the dashboard renders
│   └── docs/                     architecture, safety model, step reference
└── frontend/                     the dashboard
    └── src/                      pages, components, api client, docs
```

---

## Apple Silicon notes

Both base images are official multi-arch builds with real arm64 variants, and
`platform: linux/arm64` is set on both services. Nothing runs under QEMU.

Python wheels for the dependencies here (pydantic, uvicorn, pillow, reportlab)
all publish `manylinux_aarch64` builds, so nothing compiles from source during
the build either.

Two settings worth knowing:

- **File watching.** macOS bind mounts don't deliver inotify events into Linux
  containers, so Vite is set to poll. That's why editing a component reloads
  the browser at all.
- **File ownership.** The orchestrator runs as a non-root user whose uid is set
  from `id -u` at build time, so files it writes into `sample-project/` belong to
  you rather than to root.

Give Docker Desktop at least 4 GB of memory (Settings → Resources). The mock
profile is comfortable in less; Ollama is not.

---

## When something's wrong

**Port already in use.** `run.sh` checks first and tells you which one. Change
`CODEGEN_FRONTEND_PORT` or `CODEGEN_API_PORT` in `.env`.

**Dashboard loads but shows no run.** The orchestrator seeds one on first boot
only. `make logs` will show whether the seed failed; `make clean && make up`
starts over.

**Approving does nothing.** The watcher polls every 3 seconds and logs each
decision it picks up. `make logs` shows `[watcher]` lines.

**Want a clean slate.** `make reset` deletes the run data and restores
`backend/sample-project/` from git.
