import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet } from "../../lib/db/schema";
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
    const { JOINING_AMOUNT, payDirectCommissionOnce, calculateMatchingIncome } = await import("../../lib/mlm/engine");
    await db
      .update(users)
      .set({ isActive: true, activatedAt: new Date(), packageAmount: JOINING_AMOUNT })
      .where(eq(users.id, userId));

    // Ensure wallet exists
    const walletResult = await db.select().from(wallet).where(eq(wallet.userId, userId));
    if (walletResult.length === 0) {
      await db
        .insert(wallet)
        .values({ userId, workingBalance: 0, incomeBalance: 0, repurchaseBalance: 0, cashbackBalance: 0, totalEarned: 0 });
    }

    // Pay direct commission to referrer (idempotent) + matching income up the tree
    const referrerId = userResult[0]!.referredBy;
    if (referrerId) await payDirectCommissionOnce(userId, referrerId);
    await calculateMatchingIncome(userId);

    return { success: true };
  });
