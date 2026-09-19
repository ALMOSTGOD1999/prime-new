import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // First: get actual column names
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log('Users table columns:', cols.map(c => c.column_name).join(', '));
}

main().catch(console.error);
