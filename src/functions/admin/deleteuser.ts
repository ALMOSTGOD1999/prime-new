import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAdminUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Delete user (admin only, requires confirmation key) ──
export const deleteUser = createServerFn({ method: "POST" })
  .validator((data: { userId: number; confirmKey: string }) => data)
  .handler(async ({ data }) => {
    const adminId = await getAdminUserId();

    // Verify admin
    const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, adminId));
    if (!admin[0]?.isAdmin) throw new Error("Admin access required");

    // Verify confirmation key
    if (data.confirmKey !== "DELETE") throw new Error("Invalid confirmation key. Type DELETE to confirm.");

    // Cannot delete self
    if (data.userId === adminId) throw new Error("Cannot delete your own account");

    // Get target user
    const target = await db.select({ id: users.id, isAdmin: users.isAdmin, name: users.name }).from(users).where(eq(users.id, data.userId));
    if (!target[0]) throw new Error("User not found");

    // Cannot delete other admins
    if (target[0].isAdmin) throw new Error("Cannot delete admin accounts");

    // Delete the user
    await db.delete(users).where(eq(users.id, data.userId));

    return { success: true, deletedName: target[0].name };
  });
