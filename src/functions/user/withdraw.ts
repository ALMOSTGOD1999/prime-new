import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { wallet, withdrawals } from "../../lib/db/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

// ── Check if current time is within withdrawal window (12AM–12PM IST) ──
function isWithinWithdrawalWindow(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hour = istTime.getHours();
  return hour >= 0 && hour < 12;
}

// ── Request a withdrawal ────────────────────────────────
export const requestWithdrawal = createServerFn({ method: "POST" })
  .validator((data: { amount: number }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const { amount } = data;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }

    // Check if within withdrawal window
    if (!isWithinWithdrawalWindow()) {
      throw new Error("Withdrawals are only allowed between 12:00 AM and 12:00 PM");
    }

    // Check user wallet balance
    const walletRow = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, payload.userId));

    if (walletRow.length === 0 || walletRow[0].balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    // Deduct from wallet and create withdrawal record
    await db
      .update(wallet)
      .set({ balance: walletRow[0].balance - amount })
      .where(eq(wallet.userId, payload.userId));

    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId: payload.userId,
        amount,
        status: "pending",
      })
      .returning();

    return {
      success: true,
      withdrawalId: withdrawal.id,
      remainingBalance: walletRow[0].balance - amount,
    };
  });

// ── Get withdrawal history ──────────────────────────────
export const getWithdrawals = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const history = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, payload.userId))
      .orderBy(sql`${withdrawals.requestedAt} DESC`)
      .limit(20);

    return { withdrawals: history };
  });

// ── Get withdrawal window info ──────────────────────────
export const getWithdrawalInfo = createServerFn({ method: "GET" })
  .handler(async () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getHours();

    const isOpen = hour >= 0 && hour < 12;

    // Calculate next opening time
    let nextOpen = new Date(istTime);
    if (hour >= 12) {
      nextOpen.setDate(nextOpen.getDate() + 1);
      nextOpen.setHours(0, 0, 0, 0);
    } else {
      nextOpen.setHours(0, 0, 0, 0);
    }

    // Convert back to UTC
    const nextOpenUTC = new Date(nextOpen.getTime() - istOffset);

    return {
      isOpen,
      nextOpen: nextOpenUTC.toISOString(),
      currentHourIST: hour,
    };
  });
