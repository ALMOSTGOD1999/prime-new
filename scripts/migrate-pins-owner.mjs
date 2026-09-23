import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
const sql = neon(process.env.DATABASE_URL);

console.log('Adding owner_id to activation_pins if not exists...');
await sql`ALTER TABLE activation_pins ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL`;
console.log('Backfilling owner_id = generated_by where null...');
await sql`UPDATE activation_pins SET owner_id = generated_by WHERE owner_id IS NULL`;
console.log('Creating pin_transfers table if not exists...');
await sql`
  CREATE TABLE IF NOT EXISTS pin_transfers (
    id SERIAL PRIMARY KEY,
    pin_id INTEGER NOT NULL REFERENCES activation_pins(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`;
console.log('Done');
