// Migrate performance_incentives to the monthly-schedule shape
// (last-month business basis, 6-month payout schedule).
// The old milestone-shaped table was never used (no payout ran), so if it is
// empty we drop and recreate it. If it somehow has rows, abort loudly.
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL);

const [{ count }] = await sql`SELECT count(*)::int AS count FROM performance_incentives`;
console.log(`Existing performance_incentives rows: ${count}`);
if (count > 0) {
  console.error("ABORT: table has rows — manual migration required instead of drop/recreate.");
  process.exit(1);
}

console.log("Dropping old milestone-shaped table...");
await sql`DROP TABLE IF EXISTS performance_incentives`;

console.log("Creating schedule-shaped performance_incentives...");
await sql`
  CREATE TABLE IF NOT EXISTS performance_incentives (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id),
    rank_name text NOT NULL,
    target_business bigint NOT NULL,
    bonus_amount integer NOT NULL,
    monthly_amount integer NOT NULL,
    business_last_month bigint NOT NULL,
    paid_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    last_paid_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  )
`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS performance_incentives_user_rank_idx ON performance_incentives (user_id, rank_name)`;

console.log("Verifying...");
const cols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'performance_incentives'
  ORDER BY ordinal_position
`;
console.log("performance_incentives:", cols.map((c) => `${c.column_name} (${c.data_type})`).join(", "));

const led = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cashback_ledger' AND column_name = 'rate_pct'
`;
console.log("cashback_ledger.rate_pct:", led[0]?.data_type, "(real supports 3.5% — no change needed)");
console.log("Done.");
