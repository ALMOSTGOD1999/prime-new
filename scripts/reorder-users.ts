import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config();

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

// Step 1: Delete wallets for test accounts and Rajsagar FIRST
console.log("Step 1: Deleting wallets...");
const testEmails = ['admin1@test.com','admin2@test.com','admin3@test.com','admin4@test.com','admin5@test.com'];
const w1 = await sql`DELETE FROM wallet WHERE user_id IN (SELECT id FROM users WHERE email IN ('admin1@test.com','admin2@test.com','admin3@test.com','admin4@test.com','admin5@test.com'))`;
console.log(`Deleted ${w1.rowCount} test wallets`);

const rajWallet = await sql`DELETE FROM wallet WHERE user_id IN (SELECT id FROM users WHERE referral_code = 'PR0006')`;
console.log(`Deleted ${rajWallet.rowCount} Rajsagar wallet`);

// Step 2: Delete test accounts
console.log("Step 2: Deleting test accounts...");
const del1 = await sql`DELETE FROM users WHERE email IN ('admin1@test.com','admin2@test.com','admin3@test.com','admin4@test.com','admin5@test.com')`;
console.log(`Deleted ${del1.rowCount} test accounts`);

// Step 3: Delete Rajsagar
console.log("Step 3: Deleting Rajsagar...");
const del2 = await sql`DELETE FROM users WHERE referral_code = 'PR0006'`;
console.log(`Deleted ${del2.rowCount} Rajsagar`);

console.log("Cleanup complete");
