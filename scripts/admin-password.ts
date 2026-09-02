import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!);

// 1. Find admin account
const admins = await sql`SELECT id, email, name, referral_code, is_admin FROM users WHERE is_admin = true`;
console.log("Admins:", JSON.stringify(admins, null, 2));

// 2. Hash new password
const encoder = new TextEncoder();
const data = encoder.encode("Primenew#2026");
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
console.log("New hash:", hash);

// 3. Update admin password
if (admins.length > 0) {
  const result = await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${admins[0].id} RETURNING id, email, name`;
  console.log("Updated:", JSON.stringify(result));
}
