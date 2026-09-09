import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });
const hash = "849f1575ccfbf3a4d6cf00e6c5641b7fd4da2ed3e212c2d79ba9161a5a432ff0"; // Test@1234

// Find Rajsagar's user ID
const rajRows = await sql`SELECT id FROM users WHERE referral_code = 'PR0011'`;
const rajId = (rajRows as any).rows?.[0]?.id || (Array.isArray(rajRows) ? rajRows[0]?.id : null);
if (!rajId) { console.error("Rajsagar not found!"); process.exit(1); }
console.log(`Rajsagar ID: ${rajId}`);

let parentId = rajId;

for (let i = 1; i <= 15; i++) {
  const name = `Rajsagar ${i}`;
  const email = `rajsagar${i}@test.com`;
  const code = `RS${String(i).padStart(3, "0")}`; // RS001-RS015

  const rows = await sql`INSERT INTO users (name, email, password_hash, referral_code, referred_by, parent_id, position, is_active, package_amount) VALUES (${name}, ${email}, ${hash}, ${code}, ${rajId}, ${parentId}, 'left', true, 2999) RETURNING id`;
  const newId = (rows as any).rows?.[0]?.id || (Array.isArray(rows) ? rows[0]?.id : null);
  console.log(`Created: ${name} (${code}) id=${newId} under parent=${parentId}`);

  await sql`INSERT INTO wallet (user_id, balance, total_earned) VALUES (${newId}, 500, 500) ON CONFLICT DO NOTHING`;

  parentId = newId;
}

console.log("\nDone! Chain: Rajsagar → Rajsagar 1 → ... → Rajsagar 15");
