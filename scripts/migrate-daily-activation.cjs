// Migration: Add daily_activations table and update income type
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Running migration: Add daily_activations table...");
  
  // Create daily_activations table
  await sql`
    CREATE TABLE IF NOT EXISTS daily_activations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      activation_date TEXT NOT NULL,
      reward_amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, activation_date)
    );
  `;
  
  console.log("Migration complete: daily_activations table created");
  
  // Verify the table
  const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'daily_activations'`;
  console.log("Table exists:", result.length > 0);
}

migrate().catch(console.error);
