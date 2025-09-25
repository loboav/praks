#!/usr/bin/env bash
# Wait for Postgres to be ready. Uses pg_isready when available, falls back to TCP connect.
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
echo "Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
for i in $(seq 1 60); do
  if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; then
      echo "Postgres is ready"
      exit 0
    fi
  else
    # fallback to TCP check
    if timeout 1 bash -c "</dev/tcp/$POSTGRES_HOST/$POSTGRES_PORT" >/dev/null 2>&1; then
      echo "Postgres TCP is open"
      exit 0
    fi
  fi
  sleep 1
done
echo "Timed out waiting for Postgres"
exit 1
