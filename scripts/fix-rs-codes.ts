import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!);

// Fix Rajsagar chain: RS001-RS015 → PR+random 4 digits
for (let i = 1; i <= 15; i++) {
  const oldCode = `RS${String(i).padStart(3, "0")}`;
  const num = Math.floor(1000 + Math.random() * 9000);
  const newCode = `PR${num}`;
  await sql`UPDATE users SET referral_code = ${newCode} WHERE referral_code = ${oldCode}`;
  console.log(`${oldCode} → ${newCode}`);
}

// Verify
const all = await sql`SELECT id, name, referral_code FROM users WHERE referral_code LIKE 'PR%' ORDER BY id`;
console.log("\nAll PR users:");
for (const u of all) {
  console.log(`  #${u.id} ${u.referral_code} - ${u.name}`);
}
