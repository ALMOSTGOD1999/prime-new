import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!);

// Get current IDs
const admin = await sql`SELECT id FROM users WHERE referral_code = 'PR0000'`;
const adminId = (admin as any)[0]?.id;
console.log(`Admin ID: ${adminId}`);

const accounts = [
  { code: "PR0006", name: "Admin 1" },
  { code: "PR0007", name: "Admin 2" },
  { code: "PR0008", name: "Admin 3" },
  { code: "PR0009", name: "Admin 4" },
  { code: "PR0010", name: "Admin 5" },
  { code: "PR0011", name: "Rajsagar" },
];

// Get all user IDs
const userIds: Record<string, number> = {};
for (const acct of accounts) {
  const rows = await sql`SELECT id FROM users WHERE referral_code = ${acct.code}`;
  userIds[acct.code] = (rows as any)[0]?.id;
  console.log(`${acct.name} (${acct.code}): id=${userIds[acct.code]}`);
}

// Fix chain: Admin → Admin1 → Admin2 → Admin3 → Admin4 → Admin5 (left leg)
// Admin → Rajsagar (right leg)
const chain = ["PR0006", "PR0007", "PR0008", "PR0009", "PR0010"];

// Admin 1 is left child of Admin
await sql`UPDATE users SET parent_id = ${adminId}, position = 'left', referred_by = ${adminId} WHERE id = ${userIds["PR0006"]}`;
console.log("Admin 1 → left of Admin");

// Admin 2-5 are left children of the previous one
for (let i = 1; i < chain.length; i++) {
  const parentId = userIds[chain[i - 1]];
  const childId = userIds[chain[i]];
  await sql`UPDATE users SET parent_id = ${parentId}, position = 'left', referred_by = ${userIds["PR0006"]} WHERE id = ${childId}`;
  console.log(`${accounts[i].name} → left of ${accounts[i - 1].name}`);
}

// Rajsagar is right child of Admin
await sql`UPDATE users SET parent_id = ${adminId}, position = 'right', referred_by = ${adminId} WHERE id = ${userIds["PR0011"]}`;
console.log("Rajsagar → right of Admin");

console.log("\nDone! Tree restructured.");
