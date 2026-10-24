import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
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

// ── Toggle user activation (admin only) ──
export const toggleUserActivation = createServerFn({ method: "POST" })
  .validator((data: { userId: number }) => data)
  .handler(async ({ data }) => {
    await getAdminId();

    const user = await db.select({ isActive: users.isActive, referredBy: users.referredBy }).from(users).where(eq(users.id, data.userId));
    if (user.length === 0) throw new Error("User not found");

    const wasActive = user[0]!.isActive;
    const newActive = !wasActive;

    if (newActive) {
      // Activating: stamp activation fields, then pay any commission not already
      // paid for this join (payDirectCommissionOnce is idempotent; matching income
      // is self-limiting because it is gated on the existing pair count).
      const { JOINING_AMOUNT, payDirectCommissionOnce, calculateMatchingIncome } = await import("../../lib/mlm/engine");
      await db
        .update(users)
        .set({ isActive: true, activatedAt: new Date(), packageAmount: JOINING_AMOUNT })
        .where(eq(users.id, data.userId));

      const referrerId = user[0]!.referredBy;
      if (referrerId) await payDirectCommissionOnce(data.userId, referrerId);
      await calculateMatchingIncome(data.userId);
    } else {
      // Deactivating: flag only, keep activation history intact.
      await db.update(users).set({ isActive: false }).where(eq(users.id, data.userId));
    }

    return { success: true, isActive: newActive };
  });
