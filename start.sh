#!/bin/sh
# Run drizzle-kit push to sync schema
echo "Running database migration..."
npx drizzle-kit push --force 2>&1 || echo "drizzle-kit push failed, will try manual SQL"

# Manual fallback using node + neon driver
node -e "
const { neon } = require('@neondatabase/serverless');
const url = process.env.DATABASE_URL;
if (!url) { console.log('No DATABASE_URL, skipping manual migration'); process.exit(0); }
const sql = neon(url);
(async () => {
  const stmts = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS rank text DEFAULT \\'bronze\\' NOT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image text',
    'ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note text',
    \`CREATE TABLE IF NOT EXISTS notifications (id serial PRIMARY KEY, user_id integer REFERENCES users(id) NOT NULL, type text NOT NULL, title text NOT NULL, message text NOT NULL, is_read boolean DEFAULT false NOT NULL, created_at timestamp DEFAULT now() NOT NULL)\`,
    \`CREATE TABLE IF NOT EXISTS kyc (id serial PRIMARY KEY, user_id integer REFERENCES users(id) NOT NULL UNIQUE, pan_number text, aadhaar_number text, bank_name text, account_number text, ifsc_code text, status text DEFAULT 'pending' NOT NULL, rejection_reason text, verified_at timestamp, created_at timestamp DEFAULT now() NOT NULL)\`,
  ];
  for (const s of stmts) {
    try { await sql(s); } catch(e) { console.log('Skip:', e.message?.substring(0, 80)); }
  }
  console.log('Manual migration complete');
})().catch(e => console.log('Migration error:', e.message));
" 2>&1 || echo "Manual migration skipped"

exec node .output/server/index.mjs
