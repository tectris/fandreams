#!/bin/sh

echo "=== Running database schema push ==="
cd /app/packages/database
timeout 60 npx drizzle-kit push --force 2>&1 || echo "WARNING: Database schema push failed or timed out (continuing...)"
cd /app/apps/api
echo "=== Database schema push complete ==="

if [ -n "$ADMIN_EMAIL" ]; then
  echo "=== Creating admin user ==="
  timeout 30 npx tsx src/scripts/create-admin.ts 2>&1 || echo "WARNING: Admin setup failed or timed out (continuing...)"
  echo "=== Admin setup complete ==="
fi

echo "=== Starting API server ==="
exec node dist/index.js
