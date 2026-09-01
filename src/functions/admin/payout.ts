import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { withdrawals, users, wallet } from "../../lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAdminId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  const userId = payload["userId"] as number;
  const adminCheck = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (adminCheck.length === 0 || !adminCheck[0]!.isAdmin) throw new Error("Not authorized");
  return userId;
}

// ── Get pending payouts ─────────────────────────────────
export const getPendingPayouts = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const result = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        amount: withdrawals.amount,
        status: withdrawals.status,
        adminNote: withdrawals.adminNote,
        requestedAt: withdrawals.requestedAt,
        processedAt: withdrawals.processedAt,
        userName: users.name,
        userEmail: users.email,
        userReferralCode: users.referralCode,
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .orderBy(desc(withdrawals.requestedAt))
      .limit(100);

    return { payouts: result };
  });

// ── Process payout ──────────────────────────────────────
export const processPayout = createServerFn({ method: "POST" })
  .validator((data: { withdrawalId: number; action: "approved" | "rejected"; note?: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();

    const { withdrawalId, action, note } = data;

    // Get withdrawal
    const result = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
    if (result.length === 0) throw new Error("Withdrawal not found");

    const w = result[0]!;
    if (w.status !== "pending") throw new Error("Withdrawal already processed");

    // If rejecting, refund the wallet
    if (action === "rejected") {
      const userWallet = await db.select().from(wallet).where(eq(wallet.userId, w.userId));
      if (userWallet.length > 0) {
        await db
          .update(wallet)
          .set({ balance: userWallet[0]!.balance + w.amount })
          .where(eq(wallet.userId, w.userId));
      }
    }

    // Update withdrawal status
    await db
      .update(withdrawals)
      .set({
        status: action,
        adminNote: note || null,
        processedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId));

    return { success: true };
  });
