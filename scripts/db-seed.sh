#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker-compose.local.yml}"

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "==> Starting postgres dependency..."
dc up -d postgres

echo "==> Running auth prisma seed in Docker..."
dc run --rm --no-deps auth sh -c "npx prisma db seed"

echo "Auth seed completed successfully."
