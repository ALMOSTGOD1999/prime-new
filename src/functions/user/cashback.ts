import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { cashbackLedger, income, purchases, wallet } from "../../lib/db/schema";
import { CASHBACK_CAP_PCT, CASHBACK_MIN_BILLING } from "../../lib/mlm/gold-cashback";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── My Gold Purchase Cashback ──────────────────────────
export const getMyCashback = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const w = await db.select().from(wallet).where(eq(wallet.userId, userId));
    const balance = w[0]?.cashbackBalance ?? 0;

    const ledgerRows = await db
      .select({
        id: cashbackLedger.id,
        purchaseId: cashbackLedger.purchaseId,
        purchaseValue: cashbackLedger.purchaseValue,
        ratePct: cashbackLedger.ratePct,
        monthlyAmount: cashbackLedger.monthlyAmount,
        capAmount: cashbackLedger.capAmount,
        totalPaid: cashbackLedger.totalPaid,
        paidCount: cashbackLedger.paidCount,
        status: cashbackLedger.status,
        startedAt: cashbackLedger.startedAt,
        lastPaidAt: cashbackLedger.lastPaidAt,
        completedAt: cashbackLedger.completedAt,
        purchaseDate: purchases.createdAt,
      })
      .from(cashbackLedger)
      .leftJoin(purchases, eq(cashbackLedger.purchaseId, purchases.id))
      .where(eq(cashbackLedger.userId, userId))
      .orderBy(desc(cashbackLedger.id));

    const history = await db
      .select()
      .from(income)
      .where(eq(income.userId, userId))
      .orderBy(desc(income.id))
      .limit(50);

    return {
      balance,
      minBilling: CASHBACK_MIN_BILLING,
      capPct: CASHBACK_CAP_PCT,
      ledger: ledgerRows,
      history: history.filter((h) => h.type === "cashback"),
    };
  });
