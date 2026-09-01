import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { income } from "../../lib/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

type DayEntry = { date: string; direct: number; matching: number; award: number; total: number };

function buildDays(rows: { date: string; type: string; total: number }[], count: number): DayEntry[] {
  const now = new Date();
  const dayMap = new Map<string, DayEntry>();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    dayMap.set(dateStr, { date: dateStr, direct: 0, matching: 0, award: 0, total: 0 });
  }

  for (const row of rows) {
    const entry = dayMap.get(row.date);
    if (entry) {
      if (row.type === "direct") entry.direct = row.total;
      else if (row.type === "matching") entry.matching = row.total;
      else if (row.type === "award") entry.award = row.total;
      entry.total = entry.direct + entry.matching + entry.award;
    }
  }

  return Array.from(dayMap.values());
}

function calcTotals(days: DayEntry[]) {
  return days.reduce(
    (acc, d) => ({
      direct: acc.direct + d.direct,
      matching: acc.matching + d.matching,
      award: acc.award + d.award,
      total: acc.total + d.total,
    }),
    { direct: 0, matching: 0, award: 0, total: 0 },
  );
}

// ── Get weekly report (last 7 days) ─────────────────────
export const getWeeklyReport = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const result = await db
      .select({
        date: sql<string>`to_char(${income.createdAt}, 'YYYY-MM-DD')`,
        type: income.type,
        total: sql<number>`sum(${income.amount})::int`,
      })
      .from(income)
      .where(and(eq(income.userId, userId), gte(income.createdAt, weekAgo)))
      .groupBy(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`, income.type)
      .orderBy(desc(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`));

    const days = buildDays(result, 7);
    const totals = calcTotals(days);
    return { days, totals };
  });

// ── Get monthly report (last 30 days) ───────────────────
export const getMonthlyReport = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const result = await db
      .select({
        date: sql<string>`to_char(${income.createdAt}, 'YYYY-MM-DD')`,
        type: income.type,
        total: sql<number>`sum(${income.amount})::int`,
      })
      .from(income)
      .where(and(eq(income.userId, userId), gte(income.createdAt, monthAgo)))
      .groupBy(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`, income.type)
      .orderBy(desc(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`));

    const days = buildDays(result, 30);
    const totals = calcTotals(days);
    return { days, totals };
  });
