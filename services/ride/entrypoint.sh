#!/usr/bin/env sh
set -eu

echo "==> ride entrypoint starting..."

# If compose provides DATABASE_URL_RIDE but Prisma expects DATABASE_URL, map it.
if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_URL_RIDE:-}" ]; then
  export DATABASE_URL="${DATABASE_URL_RIDE}"
fi

# Basic required envs
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${REDIS_URL:?REDIS_URL is required}"
: "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET is required}"

echo "Preparing database schema..."
npm run prisma:migrate

echo "Starting service..."
exec npm run start
