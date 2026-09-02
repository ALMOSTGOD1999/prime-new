import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, pairs, wallet } from "../../lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

// ── Get leaderboard (top 20 by pairs) ───────────────────
export const getLeaderboard = createServerFn({ method: "GET" })
  .validator((data: { period?: "all" | "week" | "month" } | undefined) => data || { period: "all" })
  .handler(async ({ data }) => {
    let dateFilter = sql`1=1`;
    if (data.period === "week") {
      dateFilter = sql`${pairs.createdAt} >= NOW() - INTERVAL '7 days'`;
    } else if (data.period === "month") {
      dateFilter = sql`${pairs.createdAt} >= NOW() - INTERVAL '30 days'`;
    }

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        referralCode: users.referralCode,
        rank: users.rank,
        totalPairs: sql<number>`count(${pairs.id})::int`,
        totalEarned: wallet.totalEarned,
      })
      .from(users)
      .leftJoin(pairs, sql`${pairs.userId} = ${users.id} AND ${dateFilter}`)
      .leftJoin(wallet, sql`${wallet.userId} = ${users.id}`)
      .where(eq(users.isActive, true))
      .groupBy(users.id, users.name, users.referralCode, users.rank, wallet.totalEarned)
      .orderBy(desc(sql`count(${pairs.id})`))
      .limit(20);

    return { leaderboard: result };
  });
