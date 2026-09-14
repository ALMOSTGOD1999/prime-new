import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, purchases } from "../../lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAdminId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  const userId = payload["userId"] as number;
  const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (!admin.length || !admin[0].isAdmin) throw new Error("Admin only");
  return userId;
}

// ── Admin: Get total business stats ──
export const getTotalBusiness = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    // Total business = sum of all packageAmount across all active users
    const totalBusinessResult = await db
      .select({ total: sql<number>`coalesce(sum(${users.packageAmount}), 0)::int` })
      .from(users)
      .where(eq(users.isActive, true));

    // Total purchase business = sum of all approved purchase amounts
    const totalPurchaseResult = await db
      .select({ total: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)::int` })
      .from(purchases)
      .where(and(eq(purchases.status, "approved")));

    // Total users and active users
    const userCounts = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
      })
      .from(users);

    // Average business per active user
    const activeCount = userCounts[0]?.active ?? 0;
    const totalBiz = totalBusinessResult[0]?.total ?? 0;
    const avgBusiness = activeCount > 0 ? Math.round(totalBiz / activeCount) : 0;

    return {
      totalBusiness: totalBiz,
      totalPurchaseBusiness: totalPurchaseResult[0]?.total ?? 0,
      totalUsers: userCounts[0]?.total ?? 0,
      activeUsers: activeCount,
      avgBusinessPerUser: avgBusiness,
    };
  });
