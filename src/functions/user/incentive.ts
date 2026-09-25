import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { performanceIncentives, users } from "../../lib/db/schema";
import {
  PERFORMANCE_GROWTH_MONTHS,
  PERFORMANCE_GROWTH_PCT,
  PERFORMANCE_RANKS,
  computeBusinessMap,
} from "../../lib/mlm/performance-incentive";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── My Performance Incentive status ────────────────────
export const getMyPerformanceIncentive = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const businessMap = await computeBusinessMap();
    const business = businessMap.get(userId) ?? { left: 0, right: 0, total: 0 };

    const milestones = await db
      .select()
      .from(performanceIncentives)
      .where(eq(performanceIncentives.userId, userId))
      .orderBy(desc(performanceIncentives.id));

    const user = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));

    const ranks = PERFORMANCE_RANKS.map((r) => ({
      ...r,
      reached: business.total >= r.target,
      progress: Math.min(100, Math.floor((business.total / r.target) * 100)),
    }));

    return {
      business,
      ranks,
      milestones,
      growthPct: PERFORMANCE_GROWTH_PCT,
      growthMonths: PERFORMANCE_GROWTH_MONTHS,
      joinedAt: user[0]?.createdAt ?? null,
    };
  });
