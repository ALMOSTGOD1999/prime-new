import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, goldPriceAlerts, goldRates } from "../../lib/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Get gold price (admin-set daily rate) ────────────────
export const getGoldPrice = createServerFn({ method: "GET" })
  .handler(async () => {
    // Get latest admin-set rate
    const result = await db
      .select({
        id: goldRates.id,
        price: goldRates.price,
        createdAt: goldRates.createdAt,
        setByName: sql<string>`(SELECT name FROM users WHERE id = ${goldRates.setBy})`,
      })
      .from(goldRates)
      .orderBy(desc(goldRates.createdAt))
      .limit(1);

    if (result.length > 0) {
      return {
        price: result[0].price,
        currency: "USD",
        change: 0,
        changePercent: 0,
        source: `Admin: ${result[0].setByName}`,
        timestamp: result[0].createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Fallback if no rate set yet
    return {
      price: 0,
      currency: "USD",
      change: 0,
      changePercent: 0,
      source: "No rate set yet",
      timestamp: new Date().toISOString(),
    };
  });

// ── Set price alert ────────────────────────────────────
export const setPriceAlert = createServerFn({ method: "POST" })
  .validator((data: { targetPrice: number; direction: "below" | "above" }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    // Deactivate old alerts for this direction
    await db
      .update(goldPriceAlerts)
      .set({ isActive: false })
      .where(and(
        eq(goldPriceAlerts.userId, userId),
        eq(goldPriceAlerts.direction, data.direction),
        eq(goldPriceAlerts.isActive, true),
      ));

    // Create new alert
    await db.insert(goldPriceAlerts).values({
      userId,
      targetPrice: data.targetPrice,
      direction: data.direction,
    });

    return { success: true };
  });

// ── Get user's price alerts ────────────────────────────
export const getPriceAlerts = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const result = await db
      .select()
      .from(goldPriceAlerts)
      .where(eq(goldPriceAlerts.userId, userId))
      .orderBy(sql`${goldPriceAlerts.createdAt} DESC`)
      .limit(10);

    return { alerts: result };
  });

// ── Delete price alert ─────────────────────────────────
export const deletePriceAlert = createServerFn({ method: "POST" })
  .validator((data: { alertId: number }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    await db
      .delete(goldPriceAlerts)
      .where(and(eq(goldPriceAlerts.id, data.alertId), eq(goldPriceAlerts.userId, userId)));
    return { success: true };
  });
