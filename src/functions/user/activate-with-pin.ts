import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { activationPins, users, wallet } from "../../lib/db/schema";
import { getCookie } from "@tanstack/react-start/server";
import { eq, and } from "drizzle-orm";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Activate account with PIN ──────────────────────────
export const activateWithPin = createServerFn({ method: "POST" })
  .validator((data: { pin: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const pin = data.pin?.trim();

    if (!pin || pin.length !== 6) {
      throw new Error("Please enter a valid 6-digit PIN");
    }

    // Check user exists and is not already active
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (user.length === 0) throw new Error("User not found");
    if (user[0].isActive) throw new Error("Account is already active");

    // Find and claim an unused pin
    const unusedPin = await db
      .select()
      .from(activationPins)
      .where(and(eq(activationPins.pin, pin), eq(activationPins.isUsed, false)));

    if (unusedPin.length === 0) {
      throw new Error("Invalid or already used PIN. Please check and try again.");
    }

    // Mark pin as used
    const now = new Date();
    await db
      .update(activationPins)
      .set({
        isUsed: true,
        usedBy: userId,
        usedAt: now,
      })
      .where(eq(activationPins.id, unusedPin[0].id));

    // Activate the user
    await db
      .update(users)
      .set({ isActive: true, packageAmount: 2999 })
      .where(eq(users.id, userId));

    // Create wallet if not exists
    const existingWallet = await db.select().from(wallet).where(eq(wallet.userId, userId));
    if (existingWallet.length === 0) {
      await db.insert(wallet).values({
        userId,
        workingBalance: 0,
        incomeBalance: 0,
        repurchaseBalance: 0,
        cashbackBalance: 0,
        totalEarned: 0,
      });
    }

    // Pay direct commission + matching income (reuse existing logic)
    const { payDirectCommission, calculateMatchingIncome } = await import("../../lib/mlm/engine");

    let directAmount = 0;
    if (user[0].referredBy) {
      directAmount = await payDirectCommission(userId, user[0].referredBy);
    }

    const matchingEvents = await calculateMatchingIncome(userId);

    return {
      success: true,
      message: "Account activated successfully!",
      directAmount,
      matchingPairs: matchingEvents.length,
    };
  });
