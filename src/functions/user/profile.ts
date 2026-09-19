import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, kyc } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Get full profile ────────────────────────────────────
export const getProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

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
        rank: users.rank,
        phone: users.phone,
        profileImage: users.profileImage,
        darkMode: users.darkMode,
        totalInvested: users.totalInvested,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (result.length === 0) throw new Error("User not found");

    const user = result[0]!;

    // Get parent info
    let parent = null;
    if (user.parentId) {
      const parentResult = await db
        .select({ id: users.id, name: users.name, referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, user.parentId));
      if (parentResult.length > 0) parent = parentResult[0];
    }

    // Get KYC data
    let kycData = null;
    const kycResult = await db.select().from(kyc).where(eq(kyc.userId, userId));
    if (kycResult.length > 0) {
      const k = kycResult[0]!;
      kycData = {
        panNumber: k.panNumber,
        aadhaarNumber: k.aadhaarNumber,
        bankName: k.bankName,
        accountNumber: k.accountNumber,
        ifscCode: k.ifscCode,
        status: k.status,
      };
    }

    return { user, parent, kyc: kycData };
  });

// ── Update profile ──────────────────────────────────────
export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: { email?: string; phone?: string; profileImage?: string; darkMode?: boolean }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    const updates: Record<string, any> = {};
    if (data.email !== undefined) updates["email"] = data.email;
    if (data.phone !== undefined) updates["phone"] = data.phone;
    if (data.profileImage !== undefined) updates["profileImage"] = data.profileImage;
    if (data.darkMode !== undefined) updates["darkMode"] = data.darkMode;

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await db.update(users).set(updates).where(eq(users.id, userId));

    return { success: true };
  });

// ── Change password ─────────────────────────────────────
export const changePassword = createServerFn({ method: "POST" })
  .validator((data: { currentPassword: string; newPassword: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();
    const { currentPassword, newPassword } = data;

    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    // Get current hash
    const result = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    if (result.length === 0) throw new Error("User not found");

    // Verify current password
    const { verifyPassword, hashPassword } = await import("../../lib/auth");
    const row = result[0]!;
    const valid = await verifyPassword(currentPassword, row.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");

    // Update password
    const newHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

    return { success: true };
  });
