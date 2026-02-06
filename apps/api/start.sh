#!/bin/sh
set -e

echo "=== Running database schema push ==="
npx drizzle-kit push --force --config=../../packages/database/drizzle.config.ts
echo "=== Database schema push complete ==="

if [ -n "$ADMIN_EMAIL" ]; then
  echo "=== Creating admin user ==="
  npx tsx src/scripts/create-admin.ts
  echo "=== Admin setup complete ==="
fi

echo "=== Starting API server ==="
exec node dist/index.js
