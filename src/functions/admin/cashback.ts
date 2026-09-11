import { createServerFn } from "@tanstack/react-start";
import { creditMonthlyCashback } from "../../lib/mlm/engine";
import { getCookie } from "@tanstack/react-start/server";

async function requireAdmin() {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");
  const { db } = await import("../../lib/db");
  const { users } = await import("../../lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, payload.userId));
  if (!admin[0]?.isAdmin) throw new Error("Unauthorized");
  return payload.userId;
}

// ── Monthly cashback payout (admin button) ─────────────
export const monthlyCashbackPayout = createServerFn({ method: "POST" })
  .handler(async () => {
    await requireAdmin();
    const result = await creditMonthlyCashback();
    return result;
  });
