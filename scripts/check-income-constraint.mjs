import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL);
const r = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'income'::regclass
`;
console.log("income constraints:", JSON.stringify(r, null, 1));
const w = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'wallet'::regclass
`;
console.log("wallet constraints:", JSON.stringify(w, null, 1));
