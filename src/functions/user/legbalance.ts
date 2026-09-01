import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Get leg balance ─────────────────────────────────────
export const getLegBalance = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    // Count left leg
    const leftResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.parentId, userId), eq(users.position, "left"), eq(users.isActive, true)));

    // Count right leg
    const rightResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.parentId, userId), eq(users.position, "right"), eq(users.isActive, true)));

    // Count total left (recursive)
    async function countLeftRecursive(parentId: number): Promise<number> {
      const children = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.parentId, parentId), eq(users.position, "left")));
      let total = children.length;
      for (const child of children) {
        total += await countLeftRecursive(child.id);
      }
      return total;
    }

    // Count total right (recursive)
    async function countRightRecursive(parentId: number): Promise<number> {
      const children = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.parentId, parentId), eq(users.position, "right")));
      let total = children.length;
      for (const child of children) {
        total += await countRightRecursive(child.id);
      }
      return total;
    }

    const leftTotal = await countLeftRecursive(userId);
    const rightTotal = await countRightRecursive(userId);

    return {
      leftDirect: leftResult[0]?.count ?? 0,
      rightDirect: rightResult[0]?.count ?? 0,
      leftTotal,
      rightTotal,
    };
  });
