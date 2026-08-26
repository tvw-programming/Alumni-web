#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Install everything the monorepo needs to run locally.
#
#   bash scripts/install.sh
#
# Safe to re-run. Skips anything already in place.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$(pwd)"

say() { printf '\033[38;5;179m▸\033[0m %s\n' "$*"; }
die() { printf '\033[38;5;203m▸\033[0m %s\n' "$*" >&2; exit 1; }

command -v node   >/dev/null 2>&1 || die "Node.js 18+ is required."
command -v python3 >/dev/null 2>&1 || die "Python 3.11+ is required."

# --- root workspaces --------------------------------------------------------
say "installing npm workspaces"
npm install --no-audit --no-fund

# --- core/backend -----------------------------------------------------------
say "setting up core/backend (Python)"
cd "${ROOT}/core/backend"
[[ -d .venv ]] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install --quiet -e ".[dashboard,dev,documents]"
[[ -f .env ]] || cp .env.example .env
deactivate

# --- core/backend sample project -------------------------------------------
say "installing the sample project's dev dependencies"
cd "${ROOT}/core/backend/sample-project"
"${ROOT}/core/backend/.venv/bin/pip" install --quiet -r requirements-dev.txt || \
  say "  (skipped — requirements-dev.txt could not be installed)"

# --- core/frontend ----------------------------------------------------------
say "setting up core/frontend (React)"
cd "${ROOT}/core/frontend"
npm ci --no-audit --no-fund
[[ -f .env ]] || cp .env.example .env

cd "${ROOT}"
cat <<'BANNER'

  Done.

    npm run dev:core          backend on :8000 and dashboard on :5173
    npm run dev:core-backend  backend only
    npm run dev:core-frontend dashboard only
    npm run test:core         the backend test suite
    npm run docker:up         the whole stack in Docker

BANNER
