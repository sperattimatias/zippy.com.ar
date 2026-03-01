#!/usr/bin/env bash
set -euo pipefail

# Runs Prisma migrations INSIDE Docker containers (no host node_modules required).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker-compose.local.yml}"

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "==> Starting dependencies (postgres, redis, minio)..."
dc up -d postgres redis minio

echo "==> Waiting for postgres to be ready..."
until dc exec -T postgres pg_isready -U "${POSTGRES_USER:-zippy}" -d "${POSTGRES_DB:-zippy}" >/dev/null 2>&1; do
  sleep 1
done

SERVICES=(auth ride driver payment)

for service in "${SERVICES[@]}"; do
  echo "==> [$service] prisma migrate deploy + generate"
  dc run --rm --no-deps "$service" sh -c "npx prisma migrate deploy && npx prisma generate"
done

echo "All Prisma migrations and client generations completed successfully."
