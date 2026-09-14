import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Fix PR6742: remove ₹2999 activation from packageAmount
  const result = await sql`UPDATE users SET package_amount = 600000 WHERE referral_code = 'PR6742' RETURNING id, name, referral_code, package_amount`;
  console.log("Fixed:", result);
}
main();
