import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { getIncomeSummary } from "../../lib/mlm/engine";
import { eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

export const getDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        position: users.position,
        packageAmount: users.packageAmount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (result.length === 0) {
      throw new Error("User not found");
    }

    const incomeSummary = await getIncomeSummary(payload.userId);

    return { user: result[0], income: incomeSummary };
  });
