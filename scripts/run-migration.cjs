require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

const statements = [
  "ALTER TABLE wallet ADD COLUMN income_balance integer DEFAULT 0 NOT NULL",
  "ALTER TABLE wallet ADD COLUMN working_balance integer DEFAULT 0 NOT NULL",
  "UPDATE wallet SET income_balance = balance",
  "ALTER TABLE wallet DROP COLUMN balance",
];

(async () => {
  for (const stmt of statements) {
    console.log(`Running: ${stmt}`);
    await sql(stmt);
    console.log("OK");
  }
  console.log("Migration complete!");
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
