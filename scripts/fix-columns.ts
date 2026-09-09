import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!);

// Each DDL as a plain tagged template (no interpolation needed)
console.log("Adding missing columns...");

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS rank text DEFAULT 'bronze' NOT NULL`;
console.log("✅ rank");

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text`;
console.log("✅ phone");

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image text`;
console.log("✅ profile_image");

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false NOT NULL`;
console.log("✅ onboarding_done");

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false NOT NULL`;
console.log("✅ dark_mode");

// Verify
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
console.log("\nFinal columns:", cols.map((c: any) => c.column_name).join(", "));
