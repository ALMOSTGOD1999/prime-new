import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL);

console.log("Creating cashback_ledger if not exists...");
await sql`
  CREATE TABLE IF NOT EXISTS cashback_ledger (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    purchase_id INTEGER NOT NULL UNIQUE REFERENCES purchases(id),
    purchase_value INTEGER NOT NULL,
    rate_pct REAL NOT NULL,
    monthly_amount INTEGER NOT NULL,
    cap_amount INTEGER NOT NULL,
    total_paid INTEGER NOT NULL DEFAULT 0,
    paid_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_paid_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS cashback_ledger_purchase_idx ON cashback_ledger(purchase_id)`;

console.log("Creating performance_incentives if not exists...");
await sql`
  CREATE TABLE IF NOT EXISTS performance_incentives (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rank_name TEXT NOT NULL,
    target_business BIGINT NOT NULL,
    bonus_amount INTEGER NOT NULL,
    business_at_reach BIGINT NOT NULL,
    reached_at TIMESTAMP NOT NULL DEFAULT NOW(),
    growth_deadline TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_growth',
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS performance_incentives_user_rank_idx ON performance_incentives(user_id, rank_name)`;

console.log("Verifying...");
const t1 = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'cashback_ledger' ORDER BY ordinal_position`;
const t2 = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'performance_incentives' ORDER BY ordinal_position`;
console.log("cashback_ledger:", t1.map((r) => r.column_name).join(", "));
console.log("performance_incentives:", t2.map((r) => r.column_name).join(", "));
console.log("Done");
