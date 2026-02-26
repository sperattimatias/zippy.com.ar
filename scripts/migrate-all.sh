#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES=(auth ride driver payment)

run_step() {
  local service="$1"
  local cmd="$2"

  echo "==> [$service] $cmd"
  (cd "$ROOT_DIR/services/$service" && eval "$cmd")
}

for service in "${SERVICES[@]}"; do
  run_step "$service" "npx prisma migrate deploy"
  run_step "$service" "npx prisma generate"
done

echo "All Prisma migrations and client generations completed successfully."
