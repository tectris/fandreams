#!/bin/sh

# Run SQL migrations BEFORE starting the server to avoid
# queries referencing columns that don't exist yet in the database
echo "=== Running database migrations ==="
cd /app/apps/api
timeout 60 npx tsx src/scripts/migrate.ts 2>&1
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "WARNING: Database migrations failed (exit $MIGRATE_EXIT). Falling back to drizzle-kit push..."
  cd /app/packages/database
  timeout 60 npx drizzle-kit push --force 2>&1 || echo "WARNING: drizzle-kit push also failed"
fi
echo "=== Database setup complete ==="

if [ -n "$ADMIN_EMAIL" ]; then
  echo "=== Creating admin user ==="
  cd /app/apps/api
  timeout 30 npx tsx src/scripts/create-admin.ts 2>&1 || echo "WARNING: Admin setup failed or timed out"
  echo "=== Admin setup complete ==="
fi

echo "=== Starting API server ==="
exec node /app/apps/api/dist/index.js
