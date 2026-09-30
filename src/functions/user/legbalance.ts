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

    // Count totals: one query + in-memory walk (was N+1 recursion).
    // Leg = subtree of each root child (same semantics as getTeamStats).
    const all = await db
      .select({ id: users.id, parentId: users.parentId, position: users.position })
      .from(users);

    const children = new Map<number, { id: number; position: string | null }[]>();
    for (const u of all) {
      if (u.parentId == null) continue;
      const list = children.get(u.parentId);
      if (list) list.push({ id: u.id, position: u.position });
      else children.set(u.parentId, [{ id: u.id, position: u.position }]);
    }

    let leftTotal = 0;
    let rightTotal = 0;
    const seen = new Set<number>([userId]);
    const queue: { id: number; leg: "left" | "right" }[] = [];
    for (const child of children.get(userId) ?? []) {
      if (child.position !== "left" && child.position !== "right") continue;
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      if (child.position === "left") leftTotal++;
      else rightTotal++;
      queue.push({ id: child.id, leg: child.position });
    }
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (const grandchild of children.get(cur.id) ?? []) {
        if (seen.has(grandchild.id)) continue; // cycle guard
        seen.add(grandchild.id);
        if (cur.leg === "left") leftTotal++;
        else rightTotal++;
        queue.push({ id: grandchild.id, leg: cur.leg });
      }
    }

    return {
      leftDirect: leftResult[0]?.count ?? 0,
      rightDirect: rightResult[0]?.count ?? 0,
      leftTotal,
      rightTotal,
    };
  });
