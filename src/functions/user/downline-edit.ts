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

// ── PR7727 only: change a downline user's password ────────────────
async function requirePR7727(): Promise<number> {
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
  return meId;
}

export const changeDownlinePassword = createServerFn({ method: "POST" })
  .validator((data: { userId: number; password: string }) => data)
  .handler(async ({ data }) => {
    const meId = await requirePR7727();

    const pw = (data.password || "").trim();
    if (pw.length < 6) throw new Error("Password must be at least 6 characters");
    if (data.userId === meId) throw new Error("You cannot change your own password here");

    const target = await db
      .select({ id: users.id, parentId: users.parentId })
      .from(users)
      .where(eq(users.id, data.userId));
    if (!target.length) throw new Error("User not found");

    // Same downline walk as updateUserDetails: target's parent chain must reach PR7727
    const allParents = await db.select({ id: users.id, parentId: users.parentId }).from(users);
    const parentOf = new Map(allParents.map((u) => [u.id, u.parentId]));
    let cur = target[0]!.parentId;
    let steps = 0;
    let inDownline = false;
    while (cur != null && steps < 1000) {
      if (cur === meId) {
        inDownline = true;
        break;
      }
      cur = parentOf.get(cur) ?? null;
      steps++;
    }
    if (!inDownline) throw new Error("Forbidden: you can only change passwords of users in your own downline");

    const { hashPassword } = await import("../../lib/auth");
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(pw) })
      .where(eq(users.id, data.userId));

    return { ok: true };
  });
