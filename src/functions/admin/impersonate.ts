import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

// ── Impersonate a user (admin only) ─────────────────────
export const impersonateUser = createServerFn({ method: "POST" })
  .validator((data: { targetUserId: number }) => data)
  .handler(async ({ data }) => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    // Check admin
    const adminCheck = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(sql`id = ${payload.userId}`);
    if (!adminCheck.length || !adminCheck[0].isAdmin) {
      throw new Error("Forbidden: admin only");
    }

    // Verify target user exists
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, data.targetUserId));
    if (targetUser.length === 0) {
      throw new Error("Target user not found");
    }

    // Create impersonation token with admin info
    const { signJwt } = await import("../../lib/auth");
    const impersonationToken = await signJwt({
      userId: targetUser[0].id,
      email: targetUser[0].email,
      name: targetUser[0].name,
      isAdmin: targetUser[0].isAdmin,
      impersonatorId: payload.userId,
    });

    return {
      token: impersonationToken,
      user: {
        id: targetUser[0].id,
        name: targetUser[0].name,
        referralCode: targetUser[0].referralCode,
      },
    };
  });

// ── Return from impersonation (back to admin) ───────────
export const stopImpersonation = createServerFn({ method: "POST" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const impersonatorId = (payload as any).impersonatorId;
    if (!impersonatorId) {
      throw new Error("Not impersonating anyone");
    }

    // Verify the impersonator is still admin
    const adminCheck = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(sql`id = ${impersonatorId}`);
    if (!adminCheck.length || !adminCheck[0].isAdmin) {
      throw new Error("Original admin not found or no longer admin");
    }

    // Get admin info for the restored token
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.id, impersonatorId));
    if (adminUser.length === 0) {
      throw new Error("Admin user not found");
    }

    // Create admin token
    const { signJwt } = await import("../../lib/auth");
    const adminToken = await signJwt({
      userId: adminUser[0].id,
      email: adminUser[0].email,
      name: adminUser[0].name,
      isAdmin: true,
    });

    return {
      token: adminToken,
      user: {
        id: adminUser[0].id,
        name: adminUser[0].name,
        referralCode: adminUser[0].referralCode,
      },
    };
  });
