#!/bin/sh
set -e
# Schema changes run here rather than at build time, because a build machine
# usually cannot reach the database. Both steps are idempotent.
if [ "${SKIP_DB_SETUP}" != "1" ]; then
  echo "> applying schema"
  npx prisma db push --skip-generate --accept-data-loss || echo "! schema push failed, continuing"
  node scripts/apply-indexes.mjs || echo "! index setup failed, continuing"
fi
echo "> starting Joppo on :${PORT:-3000}"
exec node server.js
