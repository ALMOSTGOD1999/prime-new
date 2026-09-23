import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
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
      const numId = Number(search.replace(/^#/, ""));
      if (!isNaN(numId) && numId > 0) {
        query = query.where(sql`${users.id} = ${numId} OR ${users.referralCode} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`);
      } else {
        query = query.where(sql`${users.referralCode} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`);
      }
    }

    const allUsers = await query.limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = countResult[0]?.count ?? 0;

    return { users: allUsers, total, page, limit };
  });

// Limited search for PR0006 — only for position manager (no other admin data)
export const getUsersForPositionManager = createServerFn({ method: "GET" })
  .validator((data: { search?: string; page?: number }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");
    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof (payload as any)["userId"] !== "number") throw new Error("Not authenticated");
    const callerId = (payload as any)["userId"] as number;
    const caller = await db.select({ isAdmin: users.isAdmin, referralCode: users.referralCode }).from(users).where(eq(users.id, callerId));
    const isPR0006 = caller.length && (caller[0].referralCode?.toUpperCase() === "PR0006" || callerId === 12);
    if (!caller.length || (!caller[0].isAdmin && !isPR0006)) throw new Error("Forbidden: only PR0006 or admin can manage positions");

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
      createdAt: users.createdAt,
    }).from(users);

    if (search) {
      const numId = Number(search.replace(/^#/, ""));
      if (!isNaN(numId) && numId > 0) {
        query = query.where(sql`${users.id} = ${numId} OR ${users.referralCode} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`}`);
      } else {
        query = query.where(sql`${users.referralCode} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`}`);
      }
    }

    const allUsers = await query.limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = countResult[0]?.count ?? 0;
    return { users: allUsers, total, page, limit };
  });

// ── Admin: change a user's left/right position (only parent_id moves to correct extreme, position preserved as chosen)
export const updateUserPosition = createServerFn({ method: "POST" })
  .validator((data: { userId: number; newPosition: "left" | "right" }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");
    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof (payload as any)["userId"] !== "number") throw new Error("Not authenticated");
    const adminId = (payload as any)["userId"] as number;
    const caller = await db.select({ isAdmin: users.isAdmin, referralCode: users.referralCode }).from(users).where(eq(users.id, adminId));
    const isPR0006b = caller.length && (caller[0].referralCode?.toUpperCase() === "PR0006" || adminId === 12);
    if (!caller.length || (!caller[0].isAdmin && !isPR0006b)) throw new Error("Forbidden: only PR0006 or admin can manage positions");

    const { userId, newPosition } = data;
    const target = await db.select().from(users).where(eq(users.id, userId));
    if (!target.length) throw new Error("User not found");
    const user = target[0];
    if (!user.referredBy) throw new Error("Root user has no position");

    // Find correct extreme slot under referrer for newPosition
    const referrerId = user.referredBy;

    // Helper: walk outer spine for extreme leaf
    async function findExtreme(sideRootId: number, side: "left" | "right") {
      let cur = sideRootId;
      while (true) {
        const child = await db.select({ id: users.id }).from(users).where(and(eq(users.parentId, cur), eq(users.position, side)));
        if (!child.length) return { parentId: cur, position: side as "left" | "right" };
        cur = child[0].id;
      }
    }

    const leftChild = await db.select({ id: users.id }).from(users).where(and(eq(users.parentId, referrerId), eq(users.position, "left")));
    const rightChild = await db.select({ id: users.id }).from(users).where(and(eq(users.parentId, referrerId), eq(users.position, "right")));
    const hasTarget = newPosition === "left" ? leftChild.length > 0 : rightChild.length > 0;

    let newParentId: number;
    if (!hasTarget) {
      newParentId = referrerId;
    } else {
      const sideRootId = newPosition === "left" ? leftChild[0]!.id : rightChild[0]!.id;
      // Don't allow moving a user under its own descendant (cycle)
      if (sideRootId === userId) throw new Error("Cannot move under itself");
      const slot = await findExtreme(sideRootId, newPosition);
      // Prevent moving under own subtree
      if (slot.parentId === userId) throw new Error("Cannot move to own descendant");
      newParentId = slot.parentId;
    }

    await db.update(users).set({ parentId: newParentId, position: newPosition }).where(eq(users.id, userId));
    return { ok: true, parentId: newParentId, position: newPosition };
  });
