import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_invested real DEFAULT 0 NOT NULL`;
    console.log("OK: total_invested added");
  } catch (e: any) {
    console.log("Note:", e.message);
  }
  const col = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_invested'`;
  console.log("total_invested exists:", col.length > 0);
}

run();
