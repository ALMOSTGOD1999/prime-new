import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, goldPriceAlerts } from "../../lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Get gold price (from public API) ───────────────────
export const getGoldPrice = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // Use a free gold price API
      const res = await fetch("https://api.gold-api.com/price/XAU", {
        headers: { "Accept": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          price: data.price || 0,
          currency: data.currency || "USD",
          change: data.ch || 0,
          changePercent: data.chp || 0,
          source: "gold-api.com",
          timestamp: new Date().toISOString(),
        };
      }
    } catch {}

    // Fallback: return a static price
    return {
      price: 3250,
      currency: "USD",
      change: 0,
      changePercent: 0,
      source: "fallback",
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
