#!/usr/bin/env bash
set -euo pipefail

docker compose -f infra/docker-compose.local.yml down -v
node ./scripts/db-migrate.js
node ./scripts/db-seed.js
