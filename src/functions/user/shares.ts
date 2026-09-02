import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { shareClicks, users } from "../../lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Track a share click ────────────────────────────────
export const trackShareClick = createServerFn({ method: "POST" })
  .validator((data: { platform: "whatsapp" | "copy" | "other"; leg?: "left" | "right" }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    await db.insert(shareClicks).values({
      userId,
      platform: data.platform,
      leg: data.leg || null,
    });
    return { success: true };
  });

// ── Get share stats ────────────────────────────────────
export const getShareStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shareClicks)
      .where(eq(shareClicks.userId, userId));

    const byPlatform = await db
      .select({
        platform: shareClicks.platform,
        count: sql<number>`count(*)::int`,
      })
      .from(shareClicks)
      .where(eq(shareClicks.userId, userId))
      .groupBy(shareClicks.platform);

    const byLeg = await db
      .select({
        leg: shareClicks.leg,
        count: sql<number>`count(*)::int`,
      })
      .from(shareClicks)
      .where(eq(shareClicks.userId, userId))
      .groupBy(shareClicks.leg);

    return {
      total: totalResult[0]?.count ?? 0,
      byPlatform,
      byLeg,
    };
  });
