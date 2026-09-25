import { eq } from "drizzle-orm";
import { db } from "../db";
import { income, performanceIncentives, users, wallet } from "../db/schema";

// ── Performance Incentive rules ────────────────────────
// Spec: 60:40 ratio accumulation basis — up to 6 months.
// Business target per rank; bonus pays only if business grows >=30% above
// the level it was at when the target was reached, within the next 3 months.
export const PERFORMANCE_GROWTH_PCT = 30;
export const PERFORMANCE_GROWTH_MONTHS = 3;

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

// Accumulated team business = sum of packageAmount over the user's entire
// downline (both legs, excludes self) — same numbers as the dashboard's
// "Left Team / Right Team business" tiles.
export type LegBusiness = { left: number; right: number; total: number };

export async function computeBusinessMap(): Promise<Map<number, LegBusiness>> {
  const all = await db
    .select({ id: users.id, parentId: users.parentId, position: users.position, packageAmount: users.packageAmount })
    .from(users);

  const childrenOf = new Map<number, { id: number; position: string | null }[]>();
  for (const u of all) {
    if (u.parentId != null) {
      const list = childrenOf.get(u.parentId) ?? [];
      list.push({ id: u.id, position: u.position });
      childrenOf.set(u.parentId, list);
    }
  }

  const amountOf = new Map(all.map((u) => [u.id, u.packageAmount ?? 0]));
  const memo = new Map<number, number>();

  const subtree = (id: number): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    memo.set(id, 0); // cycle guard
    let sum = 0;
    for (const child of childrenOf.get(id) ?? []) {
      sum += amountOf.get(child.id) ?? 0;
      sum += subtree(child.id);
    }
    memo.set(id, sum);
    return sum;
  };

  const result = new Map<number, LegBusiness>();
  for (const u of all) {
    subtree(u.id);
    let left = 0;
    let right = 0;
    for (const child of childrenOf.get(u.id) ?? []) {
      const weight = (amountOf.get(child.id) ?? 0) + subtree(child.id);
      if (child.position === "left") left += weight;
      else right += weight;
    }
    result.set(u.id, { left, right, total: left + right });
  }
  return result;
}

function growthDeadline(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + PERFORMANCE_GROWTH_MONTHS);
  return d;
}

// ── Payout (admin button) ──────────────────────────────
// For every user:
//  1) When business first meets a rank target → record milestone, start the
//     3-month growth clock (businessAtReach = business at that moment)
//  2) pending_growth milestone whose business has grown >=30% → eligible
//  3) eligible milestone → credit bonus FULLY to income wallet + income ledger
//  4) pending_growth past its deadline without 30% growth → expired
export async function runPerformanceIncentivePayout() {
  const businessMap = await computeBusinessMap();
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
  const milestones = await db.select().from(performanceIncentives);
  const byUser = new Map<number, typeof milestones>();
  for (const m of milestones) {
    const list = byUser.get(m.userId) ?? [];
    list.push(m);
    byUser.set(m.userId, list);
  }

  const now = new Date();
  const created: { userId: number; name: string; rankName: string }[] = [];
  const paid: { userId: number; name: string; rankName: string; bonus: number }[] = [];
  const expired: { userId: number; rankName: string }[] = [];
  let totalCredited = 0;

  for (const u of allUsers) {
    const business = businessMap.get(u.id)?.total ?? 0;
    if (business <= 0) continue;
    const name = nameById.get(u.id) ?? `User #${u.id}`;
    const existing = byUser.get(u.id) ?? [];
    const existingRanks = new Set(existing.map((m) => m.rankName));

    // 1) Record newly reached targets
    for (const rank of PERFORMANCE_RANKS) {
      if (business < rank.target || existingRanks.has(rank.name)) continue;
      const deadline = growthDeadline(now);
      await db.insert(performanceIncentives).values({
        userId: u.id,
        rankName: rank.name,
        targetBusiness: rank.target,
        bonusAmount: rank.bonus,
        businessAtReach: business,
        reachedAt: now,
        growthDeadline: deadline,
        status: "pending_growth",
      });
      existing.push({
        id: 0,
        userId: u.id,
        rankName: rank.name,
        targetBusiness: rank.target,
        bonusAmount: rank.bonus,
        businessAtReach: business,
        reachedAt: now,
        growthDeadline: deadline,
        status: "pending_growth",
        paidAt: null,
        createdAt: now,
      });
      created.push({ userId: u.id, name, rankName: rank.name });
    }

    // 2/3/4) Evaluate existing milestones
    for (const m of existing) {
      if (m.status === "pending_growth") {
        const required = Math.ceil((m.businessAtReach * (100 + PERFORMANCE_GROWTH_PCT)) / 100);
        if (business >= required) {
          await db
            .update(performanceIncentives)
            .set({ status: "eligible" })
            .where(eq(performanceIncentives.id, m.id));
          m.status = "eligible";
        } else if (now > m.growthDeadline) {
          await db
            .update(performanceIncentives)
            .set({ status: "expired" })
            .where(eq(performanceIncentives.id, m.id));
          m.status = "expired";
          expired.push({ userId: u.id, rankName: m.rankName });
          continue;
        } else {
          continue; // still growing
        }
      }

      if (m.status === "eligible") {
        const bonus = m.bonusAmount;
        // Credit FULL bonus to the income wallet (no 70/20/10 split)
        const w = await db.select().from(wallet).where(eq(wallet.userId, u.id));
        if (w.length > 0) {
          await db
            .update(wallet)
            .set({
              workingBalance: (w[0]?.workingBalance ?? 0) + bonus,
              incomeBalance: (w[0]?.incomeBalance ?? 0) + bonus,
              totalEarned: (w[0]?.totalEarned ?? 0) + bonus,
            })
            .where(eq(wallet.userId, u.id));
        } else {
          await db.insert(wallet).values({
            userId: u.id,
            workingBalance: bonus,
            incomeBalance: bonus,
            repurchaseBalance: 0,
            cashbackBalance: 0,
            totalEarned: bonus,
          });
        }

        await db.insert(income).values({
          userId: u.id,
          type: "performance_incentive",
          amount: bonus,
          description: `Performance Incentive — ${m.rankName} bonus (business ₹${business.toLocaleString("en-IN")})`,
        });

        await db
          .update(performanceIncentives)
          .set({ status: "paid", paidAt: new Date() })
          .where(eq(performanceIncentives.id, m.id));

        paid.push({ userId: u.id, name, rankName: m.rankName, bonus });
        totalCredited += bonus;
      }
    }
  }

  return {
    paidCount: paid.length,
    totalCredited,
    paid,
    created,
    expired,
  };
}
