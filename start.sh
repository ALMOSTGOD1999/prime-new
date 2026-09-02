#!/bin/sh
echo "Running database migration..."
npx drizzle-kit push --force 2>&1 || echo "drizzle-kit push failed, starting server anyway..."
echo "Starting server..."
exec node .output/server/index.mjs
