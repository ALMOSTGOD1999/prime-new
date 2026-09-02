import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, pairs, income, wallet, dailyPairs } from "../../lib/db/schema";
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

// ── Bulk activate users ────────────────────────────────
export const bulkActivate = createServerFn({ method: "POST" })
  .validator((data: { userIds: number[] }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    let count = 0;
    for (const uid of data.userIds) {
      try {
        await db.update(users).set({ isActive: true, packageAmount: 2999 }).where(eq(users.id, uid));
        count++;
      } catch {}
    }
    return { success: true, activated: count };
  });

// ── Bulk send notification ─────────────────────────────
export const bulkNotify = createServerFn({ method: "POST" })
  .validator((data: { userIds: number[]; title: string; message: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    const { notifications } = await import("../../lib/db/schema");
    let count = 0;
    for (const uid of data.userIds) {
      try {
        await db.insert(notifications).values({ userId: uid, type: "general", title: data.title, message: data.message });
        count++;
      } catch {}
    }
    return { success: true, sent: count };
  });

// ── Export users CSV data ──────────────────────────────
export const exportUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        position: users.position,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        rank: users.rank,
        packageAmount: users.packageAmount,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.id);

    return { users: result };
  });

// ── Revenue chart data (admin) ─────────────────────────
export const getRevenueData = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const now = new Date();
    const thirtyAgo = new Date(now);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    // Daily activations (package payments)
    const dailyActivations = await db
      .select({
        date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(and(eq(users.isActive, true), gte(users.createdAt, thirtyAgo)))
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(desc(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`));

    // Daily income paid
    const dailyIncome = await db
      .select({
        date: sql<string>`to_char(${income.createdAt}, 'YYYY-MM-DD')`,
        total: sql<number>`sum(${income.amount})::int`,
      })
      .from(income)
      .where(gte(income.createdAt, thirtyAgo))
      .groupBy(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(desc(sql`to_char(${income.createdAt}, 'YYYY-MM-DD')`));

    // Active vs inactive
    const activeCount = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.isActive, true));
    const totalCount = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    // Total revenue
    const totalRevenue = await db.select({ total: sql<number>`sum(${users.packageAmount})::int` }).from(users).where(eq(users.isActive, true));

    return {
      dailyActivations,
      dailyIncome,
      activeUsers: activeCount[0]?.count ?? 0,
      totalUsers: totalCount[0]?.count ?? 0,
      totalRevenue: totalRevenue[0]?.total ?? 0,
    };
  });
