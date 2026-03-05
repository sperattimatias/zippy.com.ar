#!/bin/sh
set -e

# -----------------------------------------------------------------------------
# Runtime env normalization
#
# docker-compose variable interpolation depends on the *project* .env/--env-file.
# But env_file already injects service-specific DATABASE_URL_* variables into the
# container. If someone runs compose without the right env-file, DATABASE_URL may
# end up empty and Prisma/Nest will crash.
#
# This shim makes the container resilient: it derives DATABASE_URL from the
# service-specific variables when needed.
# -----------------------------------------------------------------------------

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${DATABASE_URL_PAYMENT:-}" ]; then
    export DATABASE_URL="${DATABASE_URL_PAYMENT}"
  fi
fi

echo "Preparing database schema..."
# If there are migrations, use them. Otherwise push schema (dev-friendly).
if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "Running Prisma migrations (deploy)..."
  npx prisma migrate deploy
else
  echo "No migrations found. Using prisma db push (dev)..."
  npx prisma db push
fi

echo "Starting service..."
npm run start
