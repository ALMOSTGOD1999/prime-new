import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet, withdrawals } from "../../lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

// ── Full-admin gate ────────────────────────────────────
// Zeroing wallets is destructive and has a global mode, so it is full-admin only:
// caller must be users.isAdmin and must not be acting under impersonation.
// (PR7727 / PR0006 partial admins never reach users.isAdmin here.)
async function requireFullAdmin(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  const userId = payload["userId"] as number;
  if (payload["impersonatorId"]) throw new Error("Forbidden: not allowed while impersonating");

  const rows = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));
  if (rows.length === 0 || !rows[0]!.isAdmin) {
    throw new Error("Forbidden: only full admin can do this");
  }
  return userId;
}

// The four spendable balances (totalEarned is a lifetime record — never touched).
const spendable = (w: { workingBalance: number; incomeBalance: number; repurchaseBalance: number; cashbackBalance: number }) =>
  (w.workingBalance ?? 0) +
  (w.incomeBalance ?? 0) +
  (w.repurchaseBalance ?? 0) +
  (w.cashbackBalance ?? 0);

const NOTE = "Admin wallet payout — all spendable balances";

export type WalletPaidResult = {
  /** wallets whose balances were actually zeroed */
  updated: number;
  /** total amount zeroed across those wallets */
  paid: number;
  /** single-user mode only: target already sat at ₹0 */
  alreadyPaid: boolean;
};

// ── Admin: mark one user's wallet (or every wallet) as paid ──
// Rules:
//  • A wallet is only flagged `paid` when there was actually a balance to pay,
//    so a brand-new user who never earned anything keeps showing ₹0.
//  • `paid` persists: if new income later pushes a balance above 0 the UI shows
//    the amount again, and shows "Paid" again once it is back to 0.
//  • Every real payout is recorded as an approved withdrawal so history survives.
export const markWalletPaid = createServerFn({ method: "POST" })
  .validator((data: { userId?: number; all?: boolean }) => data)
  .handler(async ({ data }): Promise<WalletPaidResult> => {
    await requireFullAdmin();

    // ── Global mode: settle every wallet with a balance, in 3 statements ──
    if (data.all) {
      const rows = await db
        .select({
          userId: wallet.userId,
          workingBalance: wallet.workingBalance,
          incomeBalance: wallet.incomeBalance,
          repurchaseBalance: wallet.repurchaseBalance,
          cashbackBalance: wallet.cashbackBalance,
        })
        .from(wallet);

      const payable = rows
        .map((w) => ({ userId: w.userId, amount: spendable(w) }))
        .filter((w) => w.amount > 0);

      if (payable.length > 0) {
        await db
          .update(wallet)
          .set({
            workingBalance: 0,
            incomeBalance: 0,
            repurchaseBalance: 0,
            cashbackBalance: 0,
            paid: true,
          })
          .where(
            inArray(
              wallet.userId,
              payable.map((w) => w.userId),
            ),
          );

        const now = new Date();
        await db.insert(withdrawals).values(
          payable.map((w) => ({
            userId: w.userId,
            amount: w.amount,
            status: "approved" as const,
            requestedAt: now,
            processedAt: now,
            adminNote: NOTE,
          })),
        );
      }

      return {
        updated: payable.length,
        paid: payable.reduce((sum, w) => sum + w.amount, 0),
        alreadyPaid: false,
      };
    }

    // ── Single-user mode ──
    if (typeof data.userId !== "number") throw new Error("userId is required");

    const rows = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, data.userId));
    if (rows.length === 0) throw new Error("No wallet found for that user");

    const w = rows[0]!;
    const total = spendable(w);

    if (total <= 0) {
      // Nothing to pay. Leave an untouched wallet at ₹0; a previously paid one
      // keeps its flag so it continues to read "Paid".
      return { updated: 0, paid: 0, alreadyPaid: !!w.paid };
    }

    await db
      .update(wallet)
      .set({
        workingBalance: 0,
        incomeBalance: 0,
        repurchaseBalance: 0,
        cashbackBalance: 0,
        paid: true,
      })
      .where(eq(wallet.userId, data.userId));

    await db.insert(withdrawals).values({
      userId: data.userId,
      amount: total,
      status: "approved",
      requestedAt: new Date(),
      processedAt: new Date(),
      adminNote: NOTE,
    });

    return { updated: 1, paid: total, alreadyPaid: false };
  });
