import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { income } from "../../lib/db/schema";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// Income types that make up Working Income.
// (level income type not defined yet — add "level" here once it exists)
export const WORKING_INCOME_TYPES = ["cashback", "performance_incentive"] as const;

// ── Working Income section data ────────────────────────
// Working Income   = gross of cashback + level income + performance incentive
// Working Withdraw = 70% of that gross
// Re-Purchase      = 20% of that gross (10% admin charge is wiped)
export const getMyWorkingIncome = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const types = [...WORKING_INCOME_TYPES];

    const sums = await db
      .select({ type: income.type, total: sql<number>`coalesce(sum(${income.amount}), 0)` })
      .from(income)
      .where(eq(income.userId, userId))
      .groupBy(income.type);

    const breakdown: Record<string, number> = {};
    for (const row of sums) {
      if ((types as readonly string[]).includes(row.type)) {
        breakdown[row.type] = Number(row.total) || 0;
      }
    }

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const workingWithdraw = Math.round((total * 70) / 100);
    const repurchase = Math.round((total * 20) / 100);

    const rows = await db
      .select()
      .from(income)
      .where(eq(income.userId, userId))
      .orderBy(desc(income.id))
      .limit(30);

    return {
      total,
      breakdown,
      workingWithdraw,
      repurchase,
      adminCharge: total - workingWithdraw - repurchase,
      rows: rows.filter((r) => (types as readonly string[]).includes(r.type)),
    };
  });
