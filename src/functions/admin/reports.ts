import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet, pairs, withdrawals, income } from "../../lib/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAdminId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  const userId = payload["userId"] as number;
  const adminCheck = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (adminCheck.length === 0 || !adminCheck[0]!.isAdmin) throw new Error("Not authorized");
  return userId;
}

// ── Get admin reports ───────────────────────────────────
export const getAdminReports = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    // Total users
    const totalUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    // Active users
    const activeUsers = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.isActive, true));

    // Total income paid
    const totalIncome = await db.select({ total: sql<number>`coalesce(sum(${income.amount}), 0)::int` }).from(income);

    // Total withdrawals
    const totalWithdrawals = await db
      .select({ total: sql<number>`coalesce(sum(${withdrawals.amount}), 0)::int` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "approved"));

    // Daily signups for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignups = await db
      .select({
        date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(desc(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`));

    // Top 10 earners
    const topEarners = await db
      .select({
        id: users.id,
        name: users.name,
        referralCode: users.referralCode,
        rank: users.rank,
        totalEarned: wallet.totalEarned,
        totalPairs: sql<number>`(select count(*)::int from ${pairs} where ${pairs.userId} = ${users.id})`,
      })
      .from(users)
      .innerJoin(wallet, eq(wallet.userId, users.id))
      .orderBy(desc(wallet.totalEarned))
      .limit(10);

    return {
      totalUsers: totalUsers[0]?.count ?? 0,
      activeUsers: activeUsers[0]?.count ?? 0,
      totalIncomePaid: totalIncome[0]?.total ?? 0,
      totalWithdrawals: totalWithdrawals[0]?.total ?? 0,
      dailySignups,
      topEarners,
    };
  });
