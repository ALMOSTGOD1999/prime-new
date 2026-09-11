require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

const statements = [
  // Zero all income records
  "UPDATE income SET amount = 0",
  // Zero all wallet balances
  "UPDATE wallet SET working_balance = 0, income_balance = 0, repurchase_balance = 0, cashback_balance = 0, total_earned = 0",
  // Delete all pair records (matching income events)
  "DELETE FROM pairs",
  // Delete daily pair tracking
  "DELETE FROM daily_pairs",
];

(async () => {
  for (const stmt of statements) {
    console.log(`Running: ${stmt}`);
    await sql(stmt);
    console.log("OK");
  }
  console.log("All income zeroed. Wallets zeroed. Pairs cleared.");
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
