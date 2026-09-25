import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { income, purchases, users } from "../../lib/db/schema";
import {
  LEVEL_INCOME_MONTHS,
  LEVEL_MAX_DEPTH,
  LEVEL_RATE_TABLE,
  LEVEL_UNLOCK_TIERS,
  depthBusinessFor,
  openLevelsFor,
  rateForDepth,
} from "../../lib/mlm/level-income";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── My Level Income status ─────────────────────────────
export const getMyLevelIncome = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const all = await db
      .select({
        id: users.id,
        parentId: users.parentId,
        referredBy: users.referredBy,
        packageAmount: users.packageAmount,
        createdAt: users.createdAt,
      })
      .from(users);
    const allById = new Map(all.map((u) => [u.id, u]));

    const sponsored = new Map<number, number[]>();
    for (const u of all) {
      if (u.referredBy != null) {
        const list = sponsored.get(u.referredBy) ?? [];
        list.push(u.id);
        sponsored.set(u.referredBy, list);
      }
    }

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
      memo.set(id, 0);
      let sum = 0;
      for (const c of childrenOf.get(id) ?? []) {
        sum += c.amount + subtree(c.id);
      }
      memo.set(id, sum);
      return sum;
    };

    const directs = (sponsored.get(userId) ?? []).length;
    const teamBusiness = subtree(userId);
    const openLevels = openLevelsFor(directs, teamBusiness);

    // Trailing-30-day approved purchase volume per buyer
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sales = await db
      .select({ userId: purchases.userId, amount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)` })
      .from(purchases)
      .where(and(eq(purchases.status, "approved"), gte(purchases.createdAt, since)))
      .groupBy(purchases.userId);
    const recentSales = new Map(sales.map((s) => [s.userId, Math.round(Number(s.amount) || 0)]));

    const windowStart = new Date();
    windowStart.setMonth(windowStart.getMonth() - LEVEL_INCOME_MONTHS);

    const perDepth = depthBusinessFor(userId, sponsored, recentSales, windowStart, allById);

    const depthRows: { depth: number; label: string; rate: number; business: number; earning: number }[] = [];
    for (let d = 1; d <= LEVEL_MAX_DEPTH; d++) {
      const business = perDepth.get(d) ?? 0;
      const rate = rateForDepth(d);
      const open = d <= openLevels;
      depthRows.push({
        depth: d,
        label: d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`,
        rate,
        business,
        earning: open ? Math.round((business * rate) / 100) : 0,
      });
    }

    const tiers = LEVEL_UNLOCK_TIERS.map((t) => ({
      ...t,
      met: directs >= t.directs && teamBusiness >= t.teamBusiness,
    }));

    const history = await db
      .select()
      .from(income)
      .where(eq(income.userId, userId))
      .orderBy(desc(income.id))
      .limit(50);

    const thisMonthEarning = depthRows.reduce((s, r) => s + r.earning, 0);

    return {
      directs,
      teamBusiness,
      openLevels,
      tiers,
      rateTable: LEVEL_RATE_TABLE,
      depthRows,
      thisMonthEarning,
      months: LEVEL_INCOME_MONTHS,
      history: history.filter((h) => h.type === "level"),
    };
  });
