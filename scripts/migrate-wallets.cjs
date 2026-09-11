require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

const statements = [
  // Add new wallet columns
  "ALTER TABLE wallet ADD COLUMN IF NOT EXISTS repurchase_balance INTEGER DEFAULT 0 NOT NULL",
  "ALTER TABLE wallet ADD COLUMN IF NOT EXISTS cashback_balance INTEGER DEFAULT 0 NOT NULL",

  // Zero out ALL wallet balances (fresh start, users stay intact)
  "UPDATE wallet SET income_balance = 0, working_balance = 0, repurchase_balance = 0, cashback_balance = 0, total_earned = 0",
];

(async () => {
  for (const stmt of statements) {
    console.log(`Running: ${stmt}`);
    await sql(stmt);
    console.log("OK");
  }
  console.log("Migration complete! All wallets zeroed, new columns added.");
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
