import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { income, performanceIncentives, purchases, users } from "../db/schema";
import { distributeIncome } from "./engine";

// ── Performance Incentive rules (user-confirmed 2026-09-25) ──
// Qualifying business = total team business (left + right legs, excludes
// self) accumulated over the LAST MONTH ONLY — approved purchases in the
// trailing 30 days. (The spec's "60:40" caption refers to the matching-income
// leg split, not to this logic.)
// PAYOUT: once a rank is reached, the FULL bonus pays every month for 6
// months (e.g. STARTER ₹5L → ₹1,999 × 6). Payments are unconditional once
// enrolled — a later month's business only matters for reaching HIGHER ranks.
// ONE RANK PER USER: only the single highest rank the user is eligible for
// is enrolled and paid; lower active ranks are superseded (user-confirmed
// 2026-09-27: "one user should get only the highest package eligible").
export const PERFORMANCE_PAYOUT_MODE: "installment" | "monthly" = "monthly";
export const PERFORMANCE_MONTHS = 6;

export const PERFORMANCE_RANKS: { name: string; target: number; bonus: number }[] = [
  { name: "STARTER", target: 500_000, bonus: 1_999 },
  { name: "STARTER ELITE", target: 1_000_000, bonus: 3_499 },
  { name: "BRONZE", target: 2_500_000, bonus: 9_999 },
  { name: "SILVER", target: 5_000_000, bonus: 19_499 },
  { name: "GOLD", target: 10_000_000, bonus: 39_999 },
  { name: "PLATINUM", target: 30_000_000, bonus: 79_999 },
  { name: "EMERALD", target: 50_000_000, bonus: 129_999 },
  { name: "RUBY", target: 100_000_000, bonus: 199_999 },
  { name: "SAPPHIRE", target: 250_000_000, bonus: 259_999 },
  { name: "TOPAZ", target: 500_000_000, bonus: 449_999 },
  { name: "DIAMOND", target: 1_000_000_000, bonus: 799_999 },
  { name: "CROWN", target: 3_000_000_000, bonus: 1_499_999 },
];

export type LegBusiness = { left: number; right: number; total: number };

function monthlyAmountFor(bonus: number): number {
  return PERFORMANCE_PAYOUT_MODE === "installment"
    ? Math.round(bonus / PERFORMANCE_MONTHS)
    : bonus;
}

// ── Last-month team business ───────────────────────────
// Sum of approved purchases made in the trailing 30 days by each user's
// downline (both legs, excludes the user's own purchases). Each buyer's
// amount is attributed to every ancestor's left/right leg based on the
// position of the ancestor's direct child on the path up.
export async function computeLastMonthBusiness(): Promise<Map<number, LegBusiness>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const sales = await db
    .select({ userId: purchases.userId, amount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)` })
    .from(purchases)
    .where(and(eq(purchases.status, "approved"), gte(purchases.createdAt, since)))
    .groupBy(purchases.userId);

  const all = await db
    .select({ id: users.id, parentId: users.parentId, position: users.position })
    .from(users);
  const parentOf = new Map(all.map((u) => [u.id, u.parentId]));
  const positionOf = new Map(all.map((u) => [u.id, u.position]));

  const result = new Map<number, LegBusiness>();
  const legFor = (id: number): LegBusiness => {
    let b = result.get(id);
    if (!b) {
      b = { left: 0, right: 0, total: 0 };
      result.set(id, b);
    }
    return b;
  };

  for (const sale of sales) {
    const amount = Math.round(Number(sale.amount) || 0);
    if (amount <= 0) continue;
    let cur: number | null = sale.userId;
    const seen = new Set<number>();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      const parentId: number | null = parentOf.get(cur) ?? null;
      if (parentId == null) break;
      const bucket = legFor(parentId);
      if (positionOf.get(cur) === "left") bucket.left += amount;
      else bucket.right += amount;
      cur = parentId;
    }
  }

  for (const b of result.values()) b.total = b.left + b.right;
  return result;
}

// ── Payout (admin button) ──────────────────────────────
// 1) Enroll: for each rank whose target the user's last-month team business
//    meets, create a schedule row (once per user+rank).
// 2) Pay: each active row with paidCount < 6 gets this month's full bonus
//    payment (unconditional once enrolled). Credit goes through
//    distributeIncome (70/20/10) + an income ledger entry.
export async function runPerformanceIncentivePayout() {
  const businessMap = await computeLastMonthBusiness();
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
  const rows = await db.select().from(performanceIncentives);
  const byUser = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push(r);
    byUser.set(r.userId, list);
  }

  const enrolled: { userId: number; name: string; rankName: string }[] = [];
  const paid: { userId: number; name: string; rankName: string; amount: number; month: number }[] = [];
  let totalCredited = 0;
  let completedCount = 0;

  for (const u of allUsers) {
    const business = businessMap.get(u.id)?.total ?? 0;
    const existing = byUser.get(u.id) ?? [];
    const existingRanks = new Set(existing.map((r) => r.rankName));
    const name = nameById.get(u.id) ?? `User #${u.id}`;

    // 1) Enroll ONLY the highest rank the user is eligible for (never a
    //    lower rank than one already enrolled).
    if (business > 0) {
      const topEligible = [...PERFORMANCE_RANKS].reverse().find((r) => business >= r.target);
      const existingTopBonus = existing.reduce((m, r) => Math.max(m, r.bonusAmount), 0);
      if (topEligible && !existingRanks.has(topEligible.name) && topEligible.bonus > existingTopBonus) {
        const [row] = await db
          .insert(performanceIncentives)
          .values({
            userId: u.id,
            rankName: topEligible.name,
            targetBusiness: topEligible.target,
            bonusAmount: topEligible.bonus,
            monthlyAmount: monthlyAmountFor(topEligible.bonus),
            businessLastMonth: business,
            paidCount: 0,
            status: "active",
          })
          .returning();
        if (row) {
          existing.push(row);
          existingRanks.add(topEligible.name);
          enrolled.push({ userId: u.id, name, rankName: topEligible.name });
        }
      }
    }

    // 2) Pay this month's bonus — only the single highest active rank.
    //    Any other active schedule rows are superseded and never paid.
    const active = existing.filter((r) => r.status === "active" && r.paidCount < PERFORMANCE_MONTHS);
    let payRow: (typeof active)[number] | undefined;
    for (const r of active) {
      if (!payRow || r.bonusAmount > payRow.bonusAmount) payRow = r;
    }
    for (const r of active) {
      if (r === payRow) continue;
      r.status = "superseded";
      await db
        .update(performanceIncentives)
        .set({ status: "superseded" })
        .where(eq(performanceIncentives.id, r.id));
    }

    if (payRow) {
      const amount = payRow.monthlyAmount;
      if (amount > 0) {
        const month = payRow.paidCount + 1;
        await distributeIncome(u.id, amount);
        await db.insert(income).values({
          userId: u.id,
          type: "performance_incentive",
          amount,
          description: `Performance Incentive — ${payRow.rankName} bonus, month ${month}/${PERFORMANCE_MONTHS} (last-month team business ₹${business.toLocaleString("en-IN")})`,
        });

        const done = month >= PERFORMANCE_MONTHS;
        await db
          .update(performanceIncentives)
          .set({
            paidCount: month,
            businessLastMonth: business,
            lastPaidAt: new Date(),
            ...(done ? { status: "completed" as const } : {}),
          })
          .where(eq(performanceIncentives.id, payRow.id));

        paid.push({ userId: u.id, name, rankName: payRow.rankName, amount, month });
        totalCredited += amount;
        if (done) completedCount++;
      }
    }
  }

  return {
    mode: PERFORMANCE_PAYOUT_MODE,
    months: PERFORMANCE_MONTHS,
    paidCount: paid.length,
    totalCredited,
    enrolled: enrolled.length,
    completedCount,
    paid,
    newlyEnrolled: enrolled,
  };
}
