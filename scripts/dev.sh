#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -x .venv/bin/uvicorn || ! -d apps/web/node_modules ]]; then
  echo "Dependências ausentes. Execute: make setup"
  exit 1
fi

trap 'kill 0' EXIT INT TERM
(cd apps/api && ../../.venv/bin/uvicorn app.main:app --reload --port 8000) &
(cd apps/web && npm run dev) &
wait
