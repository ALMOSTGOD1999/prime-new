// Backfill: update packageAmount (business) for all users based on approved purchases
// Run: npx tsx scripts/backfill-business.ts

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("── Backfilling business (packageAmount) from approved purchases ──\n");

  // 1. Get all approved purchases grouped by user
  const purchaseSums = await sql`
    SELECT user_id, SUM(total_amount)::int AS total_purchase_amount
    FROM purchases
    WHERE status = 'approved'
      AND cancelled_at IS NULL
      AND stopped_at IS NULL
    GROUP BY user_id
  `;

  console.log(`Found ${purchaseSums.length} users with approved purchases\n`);

  let updated = 0;
  for (const row of purchaseSums) {
    const userId = row.user_id;
    const totalPurchase = row.total_purchase_amount;

    // Get current packageAmount
    const userResult = await sql`SELECT package_amount FROM users WHERE id = ${userId}`;
    const current = userResult[0]?.package_amount ?? 0;

    // Activation sets 2999, purchases add on top
    // If packageAmount is still 0 and user is active, they were activated but packageAmount wasn't set
    const userActive = await sql`SELECT is_active FROM users WHERE id = ${userId}`;
    const activationAmount = userActive[0]?.is_active ? 2999 : 0;

    // New packageAmount = activation + all purchases
    const newPackageAmount = activationAmount + totalPurchase;

    if (newPackageAmount !== current) {
      await sql`UPDATE users SET package_amount = ${newPackageAmount} WHERE id = ${userId}`;
      console.log(`  User #${userId}: ₹${current.toLocaleString("en-IN")} → ₹${newPackageAmount.toLocaleString("en-IN")} (activation: ₹${activationAmount.toLocaleString("en-IN")} + purchases: ₹${totalPurchase.toLocaleString("en-IN")})`);
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} users.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
