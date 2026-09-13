const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

(async () => {
  const hashed = hashPassword("Adminn#2026");
  const r = await sql`UPDATE users SET password_hash = ${hashed} WHERE is_admin = true RETURNING id, name`;
  console.log("Updated admin:", r[0]?.name);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
