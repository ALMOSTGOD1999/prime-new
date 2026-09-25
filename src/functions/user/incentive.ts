import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { performanceIncentives, users } from "../../lib/db/schema";
import {
  PERFORMANCE_MONTHS,
  PERFORMANCE_PAYOUT_MODE,
  PERFORMANCE_RANKS,
  computeLastMonthBusiness,
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

    const businessMap = await computeLastMonthBusiness();
    const business = businessMap.get(userId) ?? { left: 0, right: 0, total: 0 };

    const schedule = await db
      .select()
      .from(performanceIncentives)
      .where(eq(performanceIncentives.userId, userId))
      .orderBy(performanceIncentives.id);

    const scheduleByRank = new Map(schedule.map((s) => [s.rankName, s]));

    const user = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));

    const ranks = PERFORMANCE_RANKS.map((r) => {
      const row = scheduleByRank.get(r.name);
      return {
        ...r,
        reached: business.total >= r.target || !!row,
        progress: Math.min(100, Math.floor((business.total / r.target) * 100)),
        paidCount: row?.paidCount ?? 0,
        scheduleStatus: row?.status ?? null,
      };
    });

    return {
      business,
      ranks,
      schedule,
      months: PERFORMANCE_MONTHS,
      payoutMode: PERFORMANCE_PAYOUT_MODE,
      joinedAt: user[0]?.createdAt ?? null,
    };
  });
