import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet, income } from "../../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Reactivate account ──────────────────────────────────
export const reactivateAccount = createServerFn({ method: "POST" })
  .handler(async () => {
    const userId = await getAuthUserId();

    // Check if user is inactive
    const userResult = await db
      .select({ isActive: users.isActive, referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, userId));

    if (userResult.length === 0) throw new Error("User not found");
    if (userResult[0]!.isActive) throw new Error("Account is already active");

    // Reactivate
    await db
      .update(users)
      .set({ isActive: true, packageAmount: 2999 })
      .where(eq(users.id, userId));

    // Ensure wallet exists
    const walletResult = await db.select().from(wallet).where(eq(wallet.userId, userId));
    if (walletResult.length === 0) {
      await db.insert(wallet).values({ userId, balance: 0, totalEarned: 0 });
    }

    // Pay direct commission to referrer (5% of ₹2,999 = ₹150)
    const referrerId = userResult[0]!.referredBy;
    if (referrerId) {
      const commission = 150;
      const refWallet = await db.select().from(wallet).where(eq(wallet.userId, referrerId));
      if (refWallet.length > 0) {
        await db
          .update(wallet)
          .set({
            balance: refWallet[0]!.balance + commission,
            totalEarned: refWallet[0]!.totalEarned + commission,
          })
          .where(eq(wallet.userId, referrerId));

        await db.insert(income).values({
          userId: referrerId,
          type: "direct",
          amount: commission,
          description: `Direct commission from reactivation of user #${userId}`,
        });
      }
    }

    return { success: true };
  });
