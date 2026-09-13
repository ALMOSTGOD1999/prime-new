import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  // 1. Add totalInvested to users table
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_invested real DEFAULT 0 NOT NULL`;
    console.log("✓ Added total_invested to users");
  } catch (e: any) {
    console.log("• total_invested:", e.message);
  }

  // 2. Create investment_packages table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS investment_packages (
        id serial PRIMARY KEY,
        name text NOT NULL,
        min_amount real NOT NULL,
        max_amount real NOT NULL,
        monthly_return_pct real NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("✓ Created investment_packages table");
  } catch (e: any) {
    console.log("• investment_packages:", e.message);
  }

  // 3. Create purchases table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id serial PRIMARY KEY,
        user_id integer REFERENCES users(id) NOT NULL,
        carat integer NOT NULL,
        weight real NOT NULL,
        gold_rate_per_gram real NOT NULL,
        gold_value real NOT NULL,
        making_charges real DEFAULT 0 NOT NULL,
        gst real NOT NULL,
        hallmark_charges real DEFAULT 0 NOT NULL,
        total_amount real NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        approved_at timestamp,
        rejected_at timestamp,
        stopped_at timestamp,
        cancelled_at timestamp,
        created_by_admin boolean DEFAULT false NOT NULL,
        admin_note text,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("✓ Created purchases table");
  } catch (e: any) {
    console.log("• purchases:", e.message);
  }

  // 4. Create investments table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS investments (
        id serial PRIMARY KEY,
        user_id integer REFERENCES users(id) NOT NULL,
        purchase_id integer REFERENCES purchases(id) NOT NULL,
        package_id integer REFERENCES investment_packages(id) NOT NULL,
        amount real NOT NULL,
        monthly_return_pct real NOT NULL,
        monthly_return_amount real NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        total_returns_paid real DEFAULT 0 NOT NULL,
        start_date timestamp DEFAULT now() NOT NULL,
        end_date timestamp,
        stopped_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("✓ Created investments table");
  } catch (e: any) {
    console.log("• investments:", e.message);
  }

  // 5. Seed default investment packages
  try {
    const existing = await sql`SELECT COUNT(*)::int as count FROM investment_packages`;
    if (existing[0].count === 0) {
      await sql`
        INSERT INTO investment_packages (name, min_amount, max_amount, monthly_return_pct) VALUES
          ('Bronze', 10000, 49999, 3.0),
          ('Silver', 50000, 199999, 3.5),
          ('Gold', 200000, 999999, 4.0),
          ('Platinum', 1000000, 99999999, 5.0)
      `;
      console.log("✓ Seeded 4 investment packages");
    } else {
      console.log("• Packages exist, skipping seed");
    }
  } catch (e: any) {
    console.log("• Seed error:", e.message);
  }

  // Verify
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('purchases', 'investments', 'investment_packages') ORDER BY table_name`;
  console.log("\nTables:", tables.map((t: any) => t.table_name).join(", "));
  const pkgs = await sql`SELECT COUNT(*)::int as count FROM investment_packages`;
  console.log("Packages:", pkgs[0].count);
}

migrate().catch(console.error);
