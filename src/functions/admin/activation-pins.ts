import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { activationPins } from "../../lib/db/schema";
import { getCookie } from "@tanstack/react-start/server";
import { eq, sql, desc } from "drizzle-orm";

async function getAdminUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Generate N random 6-digit pins ─────────────────────
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Generate pins (admin only) ─────────────────────────
export const generateActivationPins = createServerFn({ method: "POST" })
  .validator((data: { count: number }) => data)
  .handler(async ({ data }) => {
    const adminId = await getAdminUserId();
    const count = data.count;
    if (count < 1 || count > 500) throw new Error("Count must be between 1 and 500");

    const pins: string[] = [];
    for (let i = 0; i < count; i++) {
      let pin: string;
      let attempts = 0;
      // Keep generating until we get a unique pin
      do {
        pin = generatePin();
        attempts++;
      } while (attempts < 10); // Prevent infinite loop
      pins.push(pin);
    }

    // Batch insert
    const values = pins.map((pin) => ({
      pin,
      isUsed: false,
      generatedBy: adminId,
    }));

    await db.insert(activationPins).values(values);

    return { generated: pins.length, pins };
  });

// ── Get all pins with stats (admin only) ───────────────
export const getActivationPins = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminUserId();

    const allPins = await db
      .select()
      .from(activationPins)
      .orderBy(desc(activationPins.createdAt));

    const totalPins = allPins.length;
    const usedPins = allPins.filter((p) => p.isUsed).length;
    const unusedPins = totalPins - usedPins;

    return {
      pins: allPins,
      stats: { total: totalPins, used: usedPins, unused: unusedPins },
    };
  });

// ── Get unused pins count ──────────────────────────────
export const getUnusedPinsCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activationPins)
      .where(eq(activationPins.isUsed, false));

    return { count: result[0]?.count ?? 0 };
  });
