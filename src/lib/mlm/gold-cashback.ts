import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { cashbackLedger, income, purchases, users, wallet } from "../db/schema";
import { distributeIncome } from "./engine";

// ── Gold Purchase Cashback rules (day-based) ───────────
// Spec (user-confirmed change): all months treated as 30 days; 1 day of
// cashback = (3% / 3.5% / 4% of the purchase value) ÷ 30; the cashback
// entitlement lasts only for the days remaining in the purchase month —
// e.g. a purchase on the 10th earns 20 days of cashback.
//   total = rate% × purchase value × (30 − purchase-day) ÷ 30   [purchase-day in IST, clamped 1–30]
// Minimum billing Rs 10,000 still applies. Tiers: 3% up to ₹1,99,999 ·
// 3.5% ₹2–5L · 4% ₹5L+. Each admin payout credits a row's full remaining
// day-based entitlement once and completes it (one-shot settlement).
// The legacy "60% of purchase value / 20 monthly payments" cap no longer
// applies — ledger rows created under the old model are settled at the
// new entitlement (no clawback: rows already paid ≥ entitlement complete
// with no further credit).
// Cashback is part of Working Income: each credit is split 70/20/10 via
// distributeIncome (70% → withdrawable, 20% → repurchase, 10% admin wiped);
// cashbackBalance tracks the gross cashback earned for the Cashback section.
export const CASHBACK_MIN_BILLING = 10000;
export const CASHBACK_DAYS_PER_MONTH = 30;

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

// Day-of-month of a purchase date in IST, clamped to 1..30
// (a purchase on the 31st behaves like the 30th).
export function purchaseDayIST(d: Date | string): number {
  const iso = new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  const dom = Number(iso.slice(8, 10));
  if (!Number.isFinite(dom)) return 30;
  return Math.min(Math.max(dom, 1), CASHBACK_DAYS_PER_MONTH);
}

// Day-based entitlement for a purchase:
//   rate    — tier % (3 / 3.5 / 4)
//   days    — days remaining in the (30-day) purchase month = 30 − purchase-day
//   total   — full cashback the purchase will ever earn = monthly% × days / 30
//   monthly — the "full-month" reference amount (rate% of value; kept for UI)
export function cashbackProratedFor(
  value: number,
  createdAt: Date | string,
): { rate: number; days: number; total: number; monthly: number } {
  const rate = cashbackRateFor(value);
  const monthly = Math.round((value * rate) / 100);
  const days = CASHBACK_DAYS_PER_MONTH - purchaseDayIST(createdAt); // 10th → 20 days
  const total = Math.max(0, Math.round((monthly * days) / CASHBACK_DAYS_PER_MONTH));
  return { rate, days, total, monthly };
}

// ── Payout (admin button) ──────────────────────────────
// 1) Enroll every approved purchase >= minimum billing that has no ledger row
// 2) Credit each active row its FULL remaining day-based entitlement once,
//    then complete it (gross → 70/20/10 via distributeIncome, plus
//    cashbackBalance tracker + income ledger entry). Rows from the legacy
//    monthly model settle too: already-paid amounts count toward the new
//    entitlement; rows paid beyond it simply complete without new credit.
export async function runGoldPurchaseCashbackPayout() {
  const eligible = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.status, "approved"), sql`${purchases.totalAmount} >= ${CASHBACK_MIN_BILLING}`));

  const existingLedger = await db.select().from(cashbackLedger);
  const ledgerByPurchase = new Map(existingLedger.map((l) => [l.purchaseId, l]));

  const eligibleById = new Map(eligible.map((p) => [p.id, p]));

  // 1) Enroll new purchases
  let enrolled = 0;
  for (const p of eligible) {
    if (ledgerByPurchase.has(p.id)) continue;
    const value = Math.round(p.totalAmount);
    const { rate, days, total, monthly } = cashbackProratedFor(value, p.createdAt);
    if (total <= 0 || days <= 0) continue;
    const [row] = await db
      .insert(cashbackLedger)
      .values({
        userId: p.userId,
        purchaseId: p.id,
        purchaseValue: value,
        ratePct: rate,
        // monthlyAmount = full-day month reference; capAmount = day-based entitlement
        monthlyAmount: monthly,
        capAmount: total,
        totalPaid: 0,
        paidCount: 0,
        status: "active",
      })
      .returning();
    if (row) {
      ledgerByPurchase.set(p.id, row);
      eligibleById.set(p.id, p);
      enrolled++;
    }
  }

  // Purchase rows for settlement: any ledger row may reference a purchase
  // not in `eligible` (e.g. legacy rows) — fetch by id.
  const ledgerPurchaseIds = [...ledgerByPurchase.keys()];
  const purchaseRows = ledgerPurchaseIds.length
    ? await db.select().from(purchases).where(inArray(purchases.id, ledgerPurchaseIds))
    : [];
  const purchaseById = new Map(purchaseRows.map((p) => [p.id, p]));
  for (const [id, p] of eligibleById) if (!purchaseById.has(id)) purchaseById.set(id, p);

  const userRows = await db.select({ id: users.id, name: users.name }).from(users);
  const nameById = new Map(userRows.map((u) => [u.id, u.name]));

  // 2) Settle each active row: credit full remaining entitlement, complete
  const credits: { userId: number; name: string; purchaseId: number; cashback: number; days: number }[] = [];
  let totalCredited = 0;

  for (const l of ledgerByPurchase.values()) {
    if (l.status !== "active") continue;
    // Only pay while the underlying purchase is still approved
    const purchase = purchaseById.get(l.purchaseId);
    if (!purchase || purchase.status !== "approved") continue;

    const { days, total: entitlement } = cashbackProratedFor(l.purchaseValue, purchase.createdAt);
    const remaining = entitlement - l.totalPaid;
    if (remaining <= 0) {
      // Legacy rows already paid beyond the day-based entitlement — done.
      await db
        .update(cashbackLedger)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(cashbackLedger.id, l.id));
      continue;
    }
    const amount = remaining; // full remainder in one credit

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
      description: `Gold purchase cashback — ${l.ratePct}% on ₹${l.purchaseValue.toLocaleString("en-IN")} · ${days} days (purchase #${l.purchaseId})`,
    });

    await db
      .update(cashbackLedger)
      .set({
        totalPaid: l.totalPaid + amount,
        paidCount: (l.paidCount ?? 0) + 1,
        lastPaidAt: new Date(),
        status: "completed" as const,
        completedAt: new Date(),
      })
      .where(eq(cashbackLedger.id, l.id));

    totalCredited += amount;
    credits.push({
      userId: l.userId,
      name: nameById.get(l.userId) ?? `User #${l.userId}`,
      purchaseId: l.purchaseId,
      cashback: amount,
      days,
    });
  }

  const totalUsers = new Set(credits.map((c) => c.userId)).size;
  return { totalUsers, totalCredited, enrolled, credited: credits };
}
