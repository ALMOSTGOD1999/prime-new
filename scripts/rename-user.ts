import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const result = await sql`UPDATE users SET name = 'SWARNA PRAVA SAHOO' WHERE id = 349 RETURNING id, name`;
  console.log("Updated:", result);
}

main().catch((err) => { console.error("Failed:", err); process.exit(1); });
