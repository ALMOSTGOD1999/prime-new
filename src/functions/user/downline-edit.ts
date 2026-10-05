import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";

// ── Edit Downline: PR7727 (D Radhamohan Reddy) only ──────────────
// Returns the caller's own placement subtree (excluding self) with the
// fields needed to edit basic details. Email/phone are intentionally NOT
// exposed by getDownlineUsers — this list is gated to PR7727 alone.
export const getDownlineEditList = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");
    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
    const meId = payload["userId"] as number;

    const me = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, meId));
    if (!me.length || me[0]!.referralCode?.toUpperCase() !== "PR7727") {
      throw new Error("Forbidden: this feature is limited to PR7727");
    }

    const all = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        referralCode: users.referralCode,
        isActive: users.isActive,
        parentId: users.parentId,
        packageAmount: users.packageAmount,
        createdAt: users.createdAt,
      })
      .from(users);

    // Placement subtree BFS from meId (exclude self), tracking depth
    const childrenOf = new Map<number, typeof all>();
    for (const u of all) {
      if (u.parentId != null) {
        const list = childrenOf.get(u.parentId) || [];
        list.push(u);
        childrenOf.set(u.parentId, list);
      }
    }
    type Row = (typeof all)[number] & { level: number };
    const out: Row[] = [];
    let queue: { u: (typeof all)[number]; depth: number }[] = (childrenOf.get(meId) || []).map((u) => ({ u, depth: 1 }));
    const seen = new Set<number>();
    while (queue.length > 0) {
      const { u, depth } = queue.shift()!;
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      out.push({ ...u, level: depth });
      for (const c of childrenOf.get(u.id) || []) queue.push({ u: c, depth: depth + 1 });
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  });
