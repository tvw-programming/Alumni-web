#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CodeGen Core backend entrypoint.
#
#   serve   validate config, seed a run if there is none, start the API and
#           the gate watcher  (default)
#   run     run the pipeline for $CODEGEN_STORY and exit
#   test    run the backend's own test suite
#   shell   drop into bash
# ---------------------------------------------------------------------------
set -euo pipefail

STORY="${CODEGEN_STORY:-DEEP-2041}"
PROFILE="${CODEGEN_PROFILE:-docker}"
# Nothing starts a pipeline on its own. A developer starts a run from the
# dashboard, or with `codegen-core run`, and until they do the stack is idle. Set
# CODEGEN_SEED_RUN=1 to get the old boot-time demo run back.
SEED="${CODEGEN_SEED_RUN:-0}"
STOP_AT="${CODEGEN_SEED_STOP:-5}"

log() { printf '\033[38;5;179m[codegen-core]\033[0m %s\n' "$*"; }
die() { printf '\033[38;5;203m[codegen-core]\033[0m %s\n' "$*" >&2; exit 1; }

codegen-core() { python -m codegen_core.cli "$@"; }

preflight() {
  log "profile ${PROFILE}, story ${STORY}"
  codegen-core config validate || die "config is invalid — the run would fail later instead of now"

  [[ -f "/stories/${STORY}.md" ]] \
    || die "no story at /stories/${STORY}.md. Add one, or set CODEGEN_STORY to an existing key."

  if [[ ! -d /workspace/app ]]; then
    log "warning: /workspace has no app/ directory — the repo scan will find nothing to describe"
  fi
}

seed_run() {
  # Only seed once. A restart should resume the existing run, not start a rival.
  if compgen -G "/data/runs/*/journal.ndjson" > /dev/null; then
    log "existing run found, leaving it alone"
    return
  fi
  [[ "${SEED}" == "1" ]] || { log "seeding disabled"; return; }

  log "seeding a run for ${STORY} up to the BRD gate"
  codegen-core run "${STORY}" --stop "${STOP_AT}" >/dev/null 2>&1 || {
    log "the seed run did not finish; the dashboard will show where it stopped"
  }

  # Open gate 06 so the dashboard has a decision to offer immediately.
  python - "${STORY}" <<'PY' || log "could not open the BRD gate"
import sys, glob, os
from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.plugins.factory import build_plugin

runs = sorted(glob.glob("/data/runs/*/journal.ndjson"), key=os.path.getmtime)
if not runs:
    raise SystemExit(0)
job_id = os.path.basename(os.path.dirname(runs[-1]))

cfg = ConfigLoader.load()
ctx = JobContext.create(cfg, sys.argv[1], job_id=job_id)
gate = cfg.gates["06"]
build_plugin(cfg, "dashboard", ctx).open_gate(ctx, 6, ctx.artifacts.of_step(5), gate)
print(f"[codegen-core] gate 06 is open for {job_id}")
PY
}

case "${1:-serve}" in
  serve)
    preflight
    seed_run
    log "watching for gate decisions"
    python /usr/local/bin/gate_watcher.py &
    WATCHER=$!
    trap 'kill "${WATCHER}" 2>/dev/null || true' EXIT INT TERM
    log "API listening on :8000"
    exec python -m uvicorn --factory codegen_core.dashboard.api:create_app \
      --host 0.0.0.0 --port 8000 --log-level warning
    ;;
  run)
    preflight
    shift
    exec python -m codegen_core.cli run "${STORY}" "$@"
    ;;
  test)
    exec python -m pytest tests -q
    ;;
  shell)
    exec /bin/bash
    ;;
  *)
    exec "$@"
    ;;
esac
