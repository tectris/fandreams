#!/bin/sh

# Run database schema push BEFORE starting the server to avoid
# queries referencing columns that don't exist yet in the database
echo "=== Running database schema push ==="
cd /app/packages/database
timeout 60 npx drizzle-kit push --force 2>&1 || echo "WARNING: Database schema push failed or timed out"
echo "=== Database schema push complete ==="

if [ -n "$ADMIN_EMAIL" ]; then
  echo "=== Creating admin user ==="
  cd /app/apps/api
  timeout 30 npx tsx src/scripts/create-admin.ts 2>&1 || echo "WARNING: Admin setup failed or timed out"
  echo "=== Admin setup complete ==="
fi

echo "=== Starting API server ==="
exec node /app/apps/api/dist/index.js
