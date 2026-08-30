import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, income } from "../../lib/db/schema";
import { sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

export const getAdminIncome = createServerFn({ method: "GET" })
  .validator((data: { type?: string }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const adminCheck = await db.select({ isAdmin: users.isAdmin }).from(users).where(sql`id = ${payload.userId}`);
    if (!adminCheck.length || !adminCheck[0].isAdmin) {
      throw new Error("Forbidden");
    }

    let query = db
      .select({
        id: income.id,
        userId: income.userId,
        userName: users.name,
        type: income.type,
        amount: income.amount,
        description: income.description,
        createdAt: income.createdAt,
      })
      .from(income)
      .leftJoin(users, sql`${income.userId} = ${users.id}`);

    if (data.type) {
      query = query.where(sql`${income.type} = ${data.type}`);
    }

    const allIncome = await query.limit(100);

    const summary = await db
      .select({
        type: income.type,
        total: sql<number>`sum(${income.amount})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(income)
      .groupBy(income.type);

    return { income: allIncome, summary };
  });
