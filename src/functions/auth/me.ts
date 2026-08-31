import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyJwt } from "../../lib/auth";

export const getMe = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) {
      throw new Error("Not authenticated");
    }

    const payload = await verifyJwt(token);
    if (!payload || typeof payload["userId"] !== "number") {
      throw new Error("Not authenticated");
    }

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        position: users.position,
        parentId: users.parentId,
        referredBy: users.referredBy,
        packageAmount: users.packageAmount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload["userId"] as number));

    if (result.length === 0) {
      throw new Error("User not found");
    }

    return { user: result[0] };
  });
