import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertRange(from: string, to: string) {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw new Error("Dates must be YYYY-MM-DD");
  if (from > to) throw new Error("From date must not be after To date");
}

// created_at is stored as UTC (session TimeZone = GMT). The app's audience is
// India, so every date bucket and display string is computed here in SQL as
// UTC + 5:30 — the JS driver parses naive timestamps as local time and would
// otherwise render them 5h30m early.
const createdIST = sql`(${users.createdAt} + interval '5 hours 30 minutes')`;
const activatedIST = sql`(${users.activatedAt} + interval '5 hours 30 minutes')`;

/** Joinings report for a custom date range. */
export const getJoiningsReport = createServerFn({ method: "POST" })
  .validator((data: { from: string; to: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    const { from, to } = data;
    assertRange(from, to);

    const range = and(
      sql`${createdIST}::date >= ${from}::date`,
      sql`${createdIST}::date <= ${to}::date`
    );

    // Per-day breakdown
    const byDay = await db
      .select({
        date: sql<string>`to_char(${createdIST}::date, 'YYYY-MM-DD')`,
        joined: sql<number>`count(*)::int`,
        activated: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
        packageSum: sql<number>`coalesce(sum(${users.packageAmount}), 0)::int`,
      })
      .from(users)
      .where(range)
      .groupBy(sql`${createdIST}::date`)
      .orderBy(sql`${createdIST}::date asc`);

    // Full listing — all display strings produced in SQL
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        referralCode: users.referralCode,
        email: users.email,
        phone: users.phone,
        position: users.position,
        packageAmount: users.packageAmount,
        isActive: users.isActive,
        referredBy: users.referredBy,
        joinedDate: sql<string>`to_char(${createdIST}::date, 'DD Mon YYYY')`,
        joinedTime: sql<string>`to_char(${createdIST}, 'HH24:MI')`,
        activatedDate: sql<string | null>`to_char(${activatedIST}, 'DD Mon YYYY')`,
      })
      .from(users)
      .where(range)
      .orderBy(desc(sql`${createdIST}`))
      .limit(2000);

    const referrerIds = [...new Set(rows.map((r) => r.referredBy).filter((v): v is number => v != null))];
    const referrers = referrerIds.length
      ? await db
          .select({ id: users.id, name: users.name, code: users.referralCode })
          .from(users)
          .where(sql`${users.id} IN (${referrerIds.join(",")})`)
      : [];
    const referrerMap = new Map(referrers.map((r) => [r.id, r]));

    const listing = rows.map((r) => ({
      id: r.id,
      name: r.name,
      referralCode: r.referralCode,
      email: r.email,
      phone: r.phone,
      joinedDate: r.joinedDate,
      joinedTime: r.joinedTime,
      activatedDate: r.activatedDate ?? "—",
      isActive: r.isActive,
      position: r.position,
      packageAmount: r.packageAmount,
      referrerCode: r.referredBy ? (referrerMap.get(r.referredBy)?.code ?? "—") : "—",
      referrerName: r.referredBy ? (referrerMap.get(r.referredBy)?.name ?? "—") : "—",
    }));

    const summary = {
      joined: rows.length,
      activated: rows.filter((r) => r.isActive).length,
      pending: rows.filter((r) => !r.isActive).length,
      packageTotal: rows.reduce((s, r) => s + (r.packageAmount || 0), 0),
      days: byDay.length,
    };

    return { from, to, summary, byDay, listing };
  });
