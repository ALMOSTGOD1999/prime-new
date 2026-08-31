import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

export const getAdminUsers = createServerFn({ method: "GET" })
  .validator((data: { search?: string; page?: number }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    // Check admin
    const adminCheck = await db.select({ isAdmin: users.isAdmin }).from(users).where(sql`id = ${payload.userId}`);
    if (!adminCheck.length || !adminCheck[0].isAdmin) {
      throw new Error("Forbidden");
    }

    const search = data.search || "";
    const page = data.page || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      referralCode: users.referralCode,
      position: users.position,
      isActive: users.isActive,
      isAdmin: users.isAdmin,
      packageAmount: users.packageAmount,
      createdAt: users.createdAt,
    }).from(users);

    if (search) {
      query = query.where(sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`);
    }

    const allUsers = await query.limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = countResult[0]?.count ?? 0;

    return { users: allUsers, total, page, limit };
  });
