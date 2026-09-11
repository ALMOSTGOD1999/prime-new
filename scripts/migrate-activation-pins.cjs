#!/usr/bin/env node

const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

async function migrateActivationPins() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set in environment");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("🔧 Creating activation_pins table...");

  await sql`
    CREATE TABLE IF NOT EXISTS "activation_pins" (
      "id" SERIAL PRIMARY KEY,
      "pin" text NOT NULL,
      "is_used" boolean DEFAULT false NOT NULL,
      "generated_by" integer REFERENCES "users"("id") NOT NULL,
      "used_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "used_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "activation_pins_pin_unique" UNIQUE ("pin")
    );
  `;

  console.log("✅ activation_pins table created successfully");

  // Verify the table
  const result = await sql`SELECT COUNT(*) FROM "activation_pins"`;
  console.log(`📊 Current PINs in table: ${result[0].count}`);
}

migrateActivationPins()
  .then(() => {
    console.log("\n✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  });
