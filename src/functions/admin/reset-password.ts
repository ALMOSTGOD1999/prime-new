import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { hashPassword } from "../../lib/auth";

// ── Admin reset user's password (only when impersonating) ──
export const adminResetPassword = createServerFn({ method: "POST" })
  .validator((data: { targetUserId: number; newPassword: string }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    // Must be impersonating (have impersonatorId in JWT)
    const impersonatorId = (payload as any).impersonatorId;
    if (!impersonatorId) {
      throw new Error("Password reset is only available while impersonating a user");
    }

    // Verify the impersonator is still admin
    const adminCheck = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(sql`id = ${impersonatorId}`);
    if (!adminCheck.length || !adminCheck[0].isAdmin) {
      throw new Error("Forbidden: admin only");
    }

    // Validate new password
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    // Verify target user exists
    const targetUser = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, data.targetUserId));
    if (targetUser.length === 0) {
      throw new Error("Target user not found");
    }

    // Hash and update password
    const newHash = await hashPassword(data.newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, data.targetUserId));

    return {
      success: true,
      message: `Password reset for ${targetUser[0].name} (#${targetUser[0].id})`,
    };
  });
