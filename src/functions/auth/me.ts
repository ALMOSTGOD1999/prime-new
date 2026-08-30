import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";

export const getMe = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    const userId = (context as any)?.userId;
    if (!userId) {
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
      .where(eq(users.id, userId));

    if (result.length === 0) {
      throw new Error("User not found");
    }

    return { user: result[0] };
  });
