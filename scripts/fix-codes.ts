import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL);

await sql`UPDATE users SET referral_code = 'PR0010' WHERE email = 'admin4@test.com'`;
await sql`UPDATE users SET referral_code = 'PR0011' WHERE email = 'admin5@test.com'`;
console.log("Fixed codes: PR0010, PR0011");
