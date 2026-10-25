require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// ── Destructive by design — require an explicit flag ──────────
// Without --destroy this script refuses to run and only prints what it
// WOULD do. It zeroes every income row, every wallet balance (including
// total_earned, which is supposed to equal the earnings ledger), and
// deletes all pairs + daily_pairs — which orphans every matching-income
// row that points at a pair.
if (!process.argv.includes("--destroy")) {
  const lines = [
    "",
    "  zero-income.cjs is DESTRUCTIVE and was not run.",
    "",
    "  It would:",
    "    - set every income.amount to 0 (including earnings still owed)",
    "    - set every wallet balance to 0, including total_earned",
    "      (breaking total_earned == earnings ledger)",
    "    - DELETE FROM pairs  -> orphans matching-income rows",
    "    - DELETE FROM daily_pairs",
    "",
    "  Take a backup first:",
    "    node scripts/db-backup.mjs",
    "",
    "  To actually run it:",
    "    node scripts/zero-income.cjs --destroy",
    "",
  ];
  console.error(lines.join("\n"));
  process.exit(1);
}

console.error("!! --destroy given: proceeding with irreversible deletions");

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
