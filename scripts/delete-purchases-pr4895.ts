import { db } from "../src/lib/db";
import { users, purchases, investments } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const targetUser = await db.select().from(users).where(eq(users.referralCode, "PR4895"));
  
  if (targetUser.length === 0) {
    console.log("User with referral code PR4895 not found.");
    return;
  }
  
  const user = targetUser[0];
  console.log(`Found user: ${user.name} (ID: ${user.id})`);
  
  // Delete investments linked to this user's purchases
  const deletedInvestments = await db.delete(investments).where(eq(investments.userId, user.id)).returning();
  console.log(`Deleted ${deletedInvestments.length} investments.`);
  
  // Delete purchases
  const deletedPurchases = await db.delete(purchases).where(eq(purchases.userId, user.id)).returning();
  console.log(`Deleted ${deletedPurchases.length} purchases.`);
  
  console.log("Done!");
}

main().catch(console.error);
