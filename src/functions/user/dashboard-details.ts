import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { income, pairs, purchases, users } from "../../lib/db/schema";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Purchases in my left/right leg (trailing 30 days) ────────────────────
// Same attribution rule as computeLastMonthBusiness(): a buyer belongs to
// the leg of the direct child of MINE that the buyer descends from. Own
// purchases are excluded — the business tiles only count the team.
export const getLegPurchases = createServerFn({ method: "POST" })
  .validator((data: { leg: "left" | "right" }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: purchases.id,
        userId: purchases.userId,
        amount: purchases.totalAmount,
        createdAt: purchases.createdAt,
        name: users.name,
        code: users.referralCode,
      })
      .from(purchases)
      .innerJoin(users, eq(purchases.userId, users.id))
      .where(and(eq(purchases.status, "approved"), gte(purchases.createdAt, since)))
      .orderBy(desc(purchases.createdAt));

    const all = await db
      .select({ id: users.id, parentId: users.parentId, position: users.position })
      .from(users);
    const parentOf = new Map(all.map((u) => [u.id, u.parentId]));
    const positionOf = new Map(all.map((u) => [u.id, u.position]));

    const out: {
      purchaseId: number;
      name: string;
      code: string;
      amount: number;
      createdAt: Date;
    }[] = [];

    for (const r of rows) {
      if (r.userId === userId) continue;
      let cur: number | null = r.userId;
      let leg: string | null = null;
      const seen = new Set<number>();
      while (cur != null && !seen.has(cur)) {
        seen.add(cur);
        const parentId: number | null = parentOf.get(cur) ?? null;
        if (parentId == null) break;
        if (parentId === userId) {
          leg = positionOf.get(cur) ?? null;
          break;
        }
        cur = parentId;
      }
      if (leg !== data.leg) continue;
      out.push({
        purchaseId: r.id,
        name: r.name,
        code: r.code,
        amount: Math.round(Number(r.amount) || 0),
        createdAt: r.createdAt,
      });
      if (out.length >= 300) break;
    }

    return {
      rows: out,
      count: out.length,
      total: out.reduce((s, r) => s + r.amount, 0),
    };
  });

// ── Customer-wise income rows for a dashboard tile ───────────────────────
export type IncomeDetailKind =
  | "cashback"
  | "direct"
  | "matching"
  | "performance_incentive"
  | "level";

export const getIncomeDetails = createServerFn({ method: "POST" })
  .validator((data: { kind: IncomeDetailKind }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    const rows = await db
      .select({
        id: income.id,
        amount: income.amount,
        pairId: income.pairId,
        description: income.description,
        createdAt: income.createdAt,
      })
      .from(income)
      .where(and(eq(income.userId, userId), eq(income.type, data.kind)))
      .orderBy(desc(income.createdAt))
      .limit(200);

    // ── Resolve the "customer" each row came from ──
    const referredIds: number[] = []; // direct: "…referring user #441"
    const purchaseIds: number[] = []; // cashback: "…(purchase #6)"
    const pairIds: number[] = []; // matching: via income.pairId

    for (const r of rows) {
      if (data.kind === "direct") {
        const m = /user #(\d+)/.exec(r.description);
        if (m) referredIds.push(Number(m[1]));
      } else if (data.kind === "cashback") {
        const m = /purchase #(\d+)/.exec(r.description);
        if (m) purchaseIds.push(Number(m[1]));
      } else if (data.kind === "matching" && r.pairId) {
        pairIds.push(r.pairId);
      }
    }

    // purchase → buyer, pair → activated member, direct → referred member
    const memberByRow = new Map<number, number>(); // income.id → user id

    if (purchaseIds.length > 0) {
      const prows = await db
        .select({ id: purchases.id, userId: purchases.userId })
        .from(purchases)
        .where(inArray(purchases.id, [...new Set(purchaseIds)]));
      const ownerOf = new Map(prows.map((p) => [p.id, p.userId]));
      for (const r of rows) {
        const m = /purchase #(\d+)/.exec(r.description);
        const owner = m ? ownerOf.get(Number(m[1])) : undefined;
        if (owner != null) memberByRow.set(r.id, owner);
      }
    }

    if (pairIds.length > 0) {
      const prows = await db
        .select({ id: pairs.id, leftUserId: pairs.leftUserId })
        .from(pairs)
        .where(inArray(pairs.id, [...new Set(pairIds)]));
      const memberOf = new Map(prows.map((p) => [p.id, p.leftUserId]));
      for (const r of rows) {
        const member = r.pairId != null ? memberOf.get(r.pairId) : undefined;
        if (member != null) memberByRow.set(r.id, member);
      }
    }

    if (referredIds.length > 0) {
      for (const r of rows) {
        const m = /user #(\d+)/.exec(r.description);
        if (m) memberByRow.set(r.id, Number(m[1]));
      }
    }

    const allIds = [...new Set(memberByRow.values())];
    const userRows =
      allIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name, code: users.referralCode })
            .from(users)
            .where(inArray(users.id, allIds))
        : [];
    const userById = new Map(userRows.map((u) => [u.id, u]));

    return rows.map((r) => {
      const memberId = memberByRow.get(r.id);
      const member = memberId != null ? userById.get(memberId) : undefined;
      return {
        id: r.id,
        description: r.description,
        amount: r.amount,
        createdAt: r.createdAt,
        member: member?.name ?? null,
        memberCode: member?.code ?? null,
      };
    });
  });
