#!/bin/sh
set -eu

echo "[entrypoint] migrations…"
node ace migration:run --force

if [ "${RUN_SEEDS:-true}" = "true" ]; then
  echo "[entrypoint] seeders…"
  node ace db:seed || echo "[entrypoint] db:seed skipped/failed (non-fatal)"
fi

echo "[entrypoint] starting: $*"
exec "$@"
