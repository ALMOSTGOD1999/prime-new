import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });
const hash = "849f1575ccfbf3a4d6cf00e6c5641b7fd4da2ed3e212c2d79ba9161a5a432ff0"; // Test@1234

// 5 test accounts: PR0006-PR0010
const testAccounts = [
  { name: "Admin 1", email: "admin1@test.com", code: "PR0006" },
  { name: "Admin 2", email: "admin2@test.com", code: "PR0007" },
  { name: "Admin 3", email: "admin3@test.com", code: "PR0008" },
  { name: "Admin 4", email: "admin4@test.com", code: "PR0009" },
  { name: "Admin 5", email: "admin5@test.com", code: "PR0010" },
];

for (const acct of testAccounts) {
  await sql`INSERT INTO users (name, email, password_hash, referral_code, referred_by, parent_id, position, is_active, package_amount) VALUES (${acct.name}, ${acct.email}, ${hash}, ${acct.code}, 1, 1, 'left', true, 2999)`;
  await sql`INSERT INTO wallet (user_id, balance, total_earned) SELECT id, 500, 500 FROM users WHERE email = ${acct.email} ON CONFLICT DO NOTHING`;
  console.log(`Created: ${acct.name} (${acct.code})`);
}

// Recreate Rajsagar as PR0011
await sql`INSERT INTO users (name, email, password_hash, referral_code, referred_by, parent_id, position, is_active, package_amount) VALUES ('Rajsagar', 'gobindawb143@gmail.com', ${hash}, 'PR0011', 1, 1, 'left', false, 0)`;
console.log("Created: Rajsagar (PR0011)");

// Verify
const all = await sql`SELECT id, name, referral_code, is_active FROM users ORDER BY id`;
console.log("\nFinal state:");
for (const u of all) {
  console.log(`  #${u.id} ${u.referral_code} ${u.is_active ? "Active" : "Inactive"} - ${u.name}`);
}
