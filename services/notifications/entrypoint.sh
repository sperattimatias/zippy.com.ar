#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_URL_NOTIFICATIONS:-}" ]; then
  export DATABASE_URL="${DATABASE_URL_NOTIFICATIONS}"
fi

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push
fi

npm run start
