import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config(); // Load .env

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const migration = readFileSync(join(import.meta.dirname, "add-gst-split-columns.sql"), "utf-8");

async function main() {
  console.log("Running migration: add-gst-split-columns.sql");
  const statements = migration.split(";").filter(s => s.trim());
  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    console.log(`> ${stmt.trim().substring(0, 80)}...`);
    await sql(stmt);
  }
  console.log("Migration complete!");
}

main().catch((e) => { console.error(e); process.exit(1); });
