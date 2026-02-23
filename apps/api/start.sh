#!/bin/sh

# Run database migrations BEFORE starting the server.
# Uses migrate.mjs (plain ESM, no tsx needed) to avoid drizzle-kit
# interactive prompts that block non-interactively.

echo "=== Running database migrations ==="
node /app/apps/api/migrate.mjs 2>&1
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "WARNING: Migrations failed (exit $MIGRATE_EXIT) - server may have issues"
fi
echo "=== Database setup complete ==="

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "=== Creating admin user ==="
  cd /app/apps/api
  timeout 30 npx tsx src/scripts/create-admin.ts 2>&1 || echo "WARNING: Admin setup failed or timed out"
  echo "=== Admin setup complete ==="
fi

echo "=== Starting API server ==="
exec node /app/apps/api/dist/index.js
