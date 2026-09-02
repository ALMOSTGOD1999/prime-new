import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL);
const hash = "849f1575ccfbf3a4d6cf00e6c5641b7fd4da2ed3e212c2d79ba9161a5a432ff0";

const names = ["Admin 1", "Admin 2", "Admin 3", "Admin 4", "Admin 5"];

for (let i = 0; i < 5; i++) {
  const email = `admin${i + 1}@test.com`;
  const code = `PR000${7 + i}`;
  await sql`INSERT INTO users (name, email, password_hash, referral_code, referred_by, parent_id, position, is_active, package_amount) VALUES (${names[i]}, ${email}, ${hash}, ${code}, 1, 1, 'left', true, 2999) ON CONFLICT (email) DO NOTHING`;
  await sql`INSERT INTO wallet (user_id, balance, total_earned) SELECT id, 500, 500 FROM users WHERE email = ${email} ON CONFLICT DO NOTHING`;
  console.log(`Created: ${names[i]} (${code})`);
}
console.log("Done");
