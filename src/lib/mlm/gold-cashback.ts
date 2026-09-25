import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { cashbackLedger, income, purchases, users, wallet } from "../db/schema";
import { distributeIncome } from "./engine";

// ── Gold Purchase Cashback rules ───────────────────────
// Spec (user-confirmed): minimum billing Rs 10,000; @3% / @3.5% / @4% per
// month by purchase value tier; "for up to 60% purchase value" = lifetime
// cashback on a purchase is capped at 60% of its value (3% → 20 months,
// 3.5% → 17 partial months, 4% → 15 months); generated monthly (admin payout).
// Cashback is part of Working Income: each credit is split 70/20/10 via
// distributeIncome (70% → withdrawable, 20% → repurchase, 10% admin wiped);
// cashbackBalance tracks the gross cashback earned for the Cashback section.
export const CASHBACK_MIN_BILLING = 10000;
export const CASHBACK_CAP_PCT = 60;

// Highest tier whose minimum the purchase value wins.
const CASHBACK_TIERS: { min: number; rate: number }[] = [
  { min: 500000, rate: 4 },     // Rs 5,00,000 and above
  { min: 200000, rate: 3.5 },   // Rs 2,00,000 – Rs 4,99,999
  { min: 0, rate: 3 },          // up to Rs 1,99,999
];

export function cashbackRateFor(value: number): number {
  for (const tier of CASHBACK_TIERS) {
    if (value >= tier.min) return tier.rate;
  }
  return 3;
}

export function cashbackMonthlyFor(value: number): { rate: number; monthly: number; cap: number } {
  const rate = cashbackRateFor(value);
  const monthly = Math.round((value * rate) / 100);
  const cap = Math.round((value * CASHBACK_CAP_PCT) / 100);
  return { rate, monthly, cap };
}

// ── Monthly payout (admin button) ──────────────────────
// 1) Enroll every approved purchase >= minimum billing that has no ledger row
// 2) Credit one month of cashback for each active ledger row (clipped at the
//    60%-of-purchase cap): gross → working/70%/20% via distributeIncome, plus
//    cashbackBalance gross tracker + income ledger entry
export async function runGoldPurchaseCashbackPayout() {
  const eligible = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.status, "approved"), gte(purchases.totalAmount, CASHBACK_MIN_BILLING)));

  const existingLedger = await db.select().from(cashbackLedger);
  const ledgerByPurchase = new Map(existingLedger.map((l) => [l.purchaseId, l]));

  // 1) Enroll new purchases
  let enrolled = 0;
  for (const p of eligible) {
    if (ledgerByPurchase.has(p.id)) continue;
    const value = Math.round(p.totalAmount);
    const { rate, monthly, cap } = cashbackMonthlyFor(value);
    if (monthly <= 0) continue;
    const [row] = await db
      .insert(cashbackLedger)
      .values({
        userId: p.userId,
        purchaseId: p.id,
        purchaseValue: value,
        ratePct: rate,
        monthlyAmount: monthly,
        capAmount: cap,
        totalPaid: 0,
        paidCount: 0,
        status: "active",
      })
      .returning();
    if (row) {
      ledgerByPurchase.set(p.id, row);
      enrolled++;
    }
  }

  // 2) Pay one month for every active ledger row
  const purchaseById = new Map(eligible.map((p) => [p.id, p]));
  const userRows = await db.select({ id: users.id, name: users.name }).from(users);
  const nameById = new Map(userRows.map((u) => [u.id, u.name]));

  const credits: { userId: number; name: string; purchaseId: number; cashback: number }[] = [];
  let totalCredited = 0;

  for (const l of ledgerByPurchase.values()) {
    if (l.status !== "active") continue;
    // Only pay while the underlying purchase is still approved
    const purchase = purchaseById.get(l.purchaseId);
    if (purchase && purchase.status !== "approved") continue;

    const remaining = l.capAmount - l.totalPaid;
    const amount = Math.min(l.monthlyAmount, remaining);
    if (amount <= 0) {
      await db
        .update(cashbackLedger)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(cashbackLedger.id, l.id));
      continue;
    }

    // Credit wallets: 70/20/10 split (Working Income) + gross cashback tracker
    await distributeIncome(l.userId, amount);
    await db
      .update(wallet)
      .set({ cashbackBalance: sql`${wallet.cashbackBalance} + ${amount}` })
      .where(eq(wallet.userId, l.userId));

    // Income ledger entry
    await db.insert(income).values({
      userId: l.userId,
      type: "cashback",
      amount,
      description: `Gold purchase cashback — ${l.ratePct}% on ₹${l.purchaseValue.toLocaleString("en-IN")} (purchase #${l.purchaseId})`,
    });

    const totalPaid = l.totalPaid + amount;
    const completed = totalPaid >= l.capAmount;
    await db
      .update(cashbackLedger)
      .set({
        totalPaid,
        paidCount: (l.paidCount ?? 0) + 1,
        lastPaidAt: new Date(),
        ...(completed ? { status: "completed" as const, completedAt: new Date() } : {}),
      })
      .where(eq(cashbackLedger.id, l.id));

    totalCredited += amount;
    credits.push({
      userId: l.userId,
      name: nameById.get(l.userId) ?? `User #${l.userId}`,
      purchaseId: l.purchaseId,
      cashback: amount,
    });
  }

  const totalUsers = new Set(credits.map((c) => c.userId)).size;
  return { totalUsers, totalCredited, enrolled, credited: credits };
}
