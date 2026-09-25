import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { income, purchases, users } from "../db/schema";
import { distributeIncome } from "./engine";

// ── Level Income rules (from spec sheet) ───────────────
// % of business at each sponsorship level (1st = direct referral generation):
//   1st 1% · 2nd 0.50% · 3rd 0.20% · 4th–7th 0.15% ·
//   8th–11th 0.10% · 12th–19th 0.05% · 20th–24th 0.02%
//
// Levels unlock by direct count + team business (BOTH required):
//   1 direct + no business req        → open levels 1–2
//   2 directs + ₹2L team business     → open levels up to 4
//   3 directs + ₹5L team business     → open levels up to 8
//   4 directs + ₹10L team business    → open levels up to 12
//   5 directs + ₹15L team business    → open levels up to 16
//   6 directs + ₹25L team business    → open levels up to 24
// ("Team Business" = total packageAmount of the placement downline, both legs,
//  all-time — the same number as the dashboard's team business tiles.)
//
// "Up to 10 months": a downline member generates level income for you for at
// most 10 months from that member's joining date (LEVEL_INCOME_MONTHS).
//
// Monthly payout (admin button): earning per level = rate% × trailing-30-day
// approved purchase volume of members at exactly that sponsorship depth.
// One credit per user per calendar month (guard against double runs).
// Level income is Working Income: credited via distributeIncome (70/20/10).
export const LEVEL_INCOME_MONTHS = 10;
export const LEVEL_MAX_DEPTH = 24;
const CALENDAR_MONTH_GUARD = "level";

export const LEVEL_RATE_TABLE: { from: number; to: number; rate: number }[] = [
  { from: 1, to: 1, rate: 1 },
  { from: 2, to: 2, rate: 0.5 },
  { from: 3, to: 3, rate: 0.2 },
  { from: 4, to: 7, rate: 0.15 },
  { from: 8, to: 11, rate: 0.1 },
  { from: 12, to: 19, rate: 0.05 },
  { from: 20, to: 24, rate: 0.02 },
];

export const LEVEL_UNLOCK_TIERS: { directs: number; teamBusiness: number; openLevels: number }[] = [
  { directs: 1, teamBusiness: 0, openLevels: 2 },
  { directs: 2, teamBusiness: 200_000, openLevels: 4 },
  { directs: 3, teamBusiness: 500_000, openLevels: 8 },
  { directs: 4, teamBusiness: 1_000_000, openLevels: 12 },
  { directs: 5, teamBusiness: 1_500_000, openLevels: 16 },
  { directs: 6, teamBusiness: 2_500_000, openLevels: 24 },
];

export function rateForDepth(depth: number): number {
  const row = LEVEL_RATE_TABLE.find((r) => depth >= r.from && depth <= r.to);
  return row?.rate ?? 0;
}

export function openLevelsFor(directs: number, teamBusiness: number): number {
  let open = 0;
  for (const t of LEVEL_UNLOCK_TIERS) {
    if (directs >= t.directs && teamBusiness >= t.teamBusiness) open = t.openLevels;
    else break;
  }
  return open;
}

// ── Shared topology helpers ────────────────────────────
async function loadUsers() {
  return db
    .select({
      id: users.id,
      parentId: users.parentId,
      position: users.position,
      referredBy: users.referredBy,
      packageAmount: users.packageAmount,
      createdAt: users.createdAt,
    })
    .from(users);
}

function buildSponsorChildren(all: Awaited<ReturnType<typeof loadUsers>>) {
  const sponsored = new Map<number, number[]>();
  for (const u of all) {
    if (u.referredBy != null) {
      const list = sponsored.get(u.referredBy) ?? [];
      list.push(u.id);
      sponsored.set(u.referredBy, list);
    }
  }
  return sponsored;
}

function buildTeamBusinessMap(all: Awaited<ReturnType<typeof loadUsers>>): Map<number, number> {
  const childrenOf = new Map<number, { id: number; amount: number }[]>();
  for (const u of all) {
    if (u.parentId != null) {
      const list = childrenOf.get(u.parentId) ?? [];
      list.push({ id: u.id, amount: u.packageAmount ?? 0 });
      childrenOf.set(u.parentId, list);
    }
  }
  const memo = new Map<number, number>();
  const subtree = (id: number): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    memo.set(id, 0); // cycle guard
    let sum = 0;
    for (const c of childrenOf.get(id) ?? []) {
      sum += c.amount;
      sum += subtree(c.id);
    }
    memo.set(id, sum);
    return sum;
  };
  const result = new Map<number, number>();
  for (const u of all) result.set(u.id, subtree(u.id));
  return result;
}

// Trailing-30-day approved purchase volume per buyer
async function loadRecentSales(): Promise<Map<number, number>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sales = await db
    .select({ userId: purchases.userId, amount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)` })
    .from(purchases)
    .where(and(eq(purchases.status, "approved"), gte(purchases.createdAt, since)))
    .groupBy(purchases.userId);
  return new Map(sales.map((s) => [s.userId, Math.round(Number(s.amount) || 0)]));
}

// Last 10 months cutoff for the per-member "up to 10 months" window
function levelWindowStart(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - LEVEL_INCOME_MONTHS);
  return d;
}

// Per-depth business for one earner: Map<depth, amount>
export function depthBusinessFor(
  earnerId: number,
  sponsored: Map<number, number[]>,
  recentSales: Map<number, number>,
  windowStart: Date,
  allById: Map<number, { createdAt: Date }>,
): Map<number, number> {
  const out = new Map<number, number>();
  let frontier = [earnerId];
  const seen = new Set<number>([earnerId]);
  for (let depth = 1; depth <= LEVEL_MAX_DEPTH && frontier.length > 0; depth++) {
    const next: number[] = [];
    for (const id of frontier) {
      for (const childId of sponsored.get(id) ?? []) {
        if (seen.has(childId)) continue;
        seen.add(childId);
        next.push(childId);
        const member = allById.get(childId);
        // "Up to 10 months": only members who joined within the window
        if (member && member.createdAt >= windowStart) {
          out.set(depth, (out.get(depth) ?? 0) + (recentSales.get(childId) ?? 0));
        }
      }
    }
    frontier = next;
  }
  return out;
}

// ── Monthly payout (admin button) ──────────────────────
export async function runLevelIncomePayout() {
  const all = await loadUsers();
  const allById = new Map(all.map((u) => [u.id, u]));
  const sponsored = buildSponsorChildren(all);
  const teamBusiness = buildTeamBusinessMap(all);
  const recentSales = await loadRecentSales();
  const windowStart = levelWindowStart();

  // Calendar-month guard: users already credited for level income this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const alreadyPaid = await db
    .select({ userId: income.userId })
    .from(income)
    .where(and(eq(income.type, CALENDAR_MONTH_GUARD), gte(income.createdAt, monthStart)));
  const paidThisMonth = new Set(alreadyPaid.map((r) => r.userId));

  const named = await db.select({ id: users.id, name: users.name }).from(users);
  const nameById = new Map(named.map((n) => [n.id, n.name]));

  const credited: { userId: number; name: string; amount: number; openLevels: number; directs: number }[] = [];
  let totalCredited = 0;

  for (const u of all) {
    if (paidThisMonth.has(u.id)) continue;

    const directs = (sponsored.get(u.id) ?? []).length;
    const openLevels = openLevelsFor(directs, teamBusiness.get(u.id) ?? 0);
    if (openLevels <= 0) continue;

    const perDepth = depthBusinessFor(u.id, sponsored, recentSales, windowStart, allById);

    let earning = 0;
    for (const [depth, business] of perDepth) {
      if (depth > openLevels) continue;
      const rate = rateForDepth(depth);
      if (rate <= 0 || business <= 0) continue;
      earning += Math.round((business * rate) / 100);
    }
    if (earning <= 0) continue;

    await distributeIncome(u.id, earning);
    await db.insert(income).values({
      userId: u.id,
      type: "level",
      amount: earning,
      description: `Level Income — ${openLevels} levels open (${directs} directs, team business ₹${(teamBusiness.get(u.id) ?? 0).toLocaleString("en-IN")}), last-month level volume`,
    });

    credited.push({
      userId: u.id,
      name: nameById.get(u.id) ?? `User #${u.id}`,
      amount: earning,
      openLevels,
      directs,
    });
    totalCredited += earning;
  }

  return {
    totalUsers: credited.length,
    totalCredited,
    credited,
  };
}
