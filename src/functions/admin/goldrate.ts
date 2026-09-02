import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { goldRates, users } from "../../lib/db/schema";
import { sql, desc, eq, and } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Set daily gold rate (admin only) ────────────────────
export const setGoldRate = createServerFn({ method: "POST" })
  .validator((data: { price: number }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    // Verify admin
    const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
    if (!admin[0]?.isAdmin) throw new Error("Admin access required");

    if (!data.price || data.price <= 0) throw new Error("Invalid price");

    // Insert new rate
    await db.insert(goldRates).values({
      price: data.price,
      setBy: userId,
    });

    return { success: true };
  });

// ── Get latest gold rate (any authenticated user) ────────
export const getLatestGoldRate = createServerFn({ method: "GET" })
  .handler(async () => {
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

    if (result.length === 0) {
      return { rate: null };
    }

    return { rate: result[0] };
  });

// ── Get gold rate history (admin) ────────────────────────
export const getGoldRateHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
    if (!admin[0]?.isAdmin) throw new Error("Admin access required");

    const result = await db
      .select({
        id: goldRates.id,
        price: goldRates.price,
        createdAt: goldRates.createdAt,
        setByName: sql<string>`(SELECT name FROM users WHERE id = ${goldRates.setBy})`,
      })
      .from(goldRates)
      .orderBy(desc(goldRates.createdAt))
      .limit(30);

    return { history: result };
  });
