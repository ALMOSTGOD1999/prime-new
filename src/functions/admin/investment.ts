import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { computeMonthlyReturns } from "../../lib/mlm/investment";

// ── Admin auth helper ──
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

// ── Admin: Process monthly investment returns ──
export const processMonthlyReturns = createServerFn({ method: "POST" })
  .handler(async () => {
    await getAdminId();
    const result = await computeMonthlyReturns();
    return result;
  });
