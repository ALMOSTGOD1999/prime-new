const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

(async () => {
  await sql`ALTER TABLE activation_pins DROP CONSTRAINT IF EXISTS activation_pins_used_by_fkey`;
  await sql`ALTER TABLE activation_pins ADD CONSTRAINT activation_pins_used_by_fkey FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL`;
  console.log("✅ Fixed: ON DELETE SET NULL applied to activation_pins.used_by");
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
