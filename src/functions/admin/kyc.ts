import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { kyc, users } from "../../lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

// ── Get pending KYC submissions ─────────────────────────
export const getPendingKyc = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const result = await db
      .select({
        id: kyc.id,
        userId: kyc.userId,
        panNumber: kyc.panNumber,
        aadhaarNumber: kyc.aadhaarNumber,
        bankName: kyc.bankName,
        accountNumber: kyc.accountNumber,
        ifscCode: kyc.ifscCode,
        status: kyc.status,
        rejectionReason: kyc.rejectionReason,
        createdAt: kyc.createdAt,
        userName: users.name,
        userEmail: users.email,
        userReferralCode: users.referralCode,
      })
      .from(kyc)
      .innerJoin(users, eq(kyc.userId, users.id))
      .orderBy(desc(kyc.createdAt))
      .limit(100);

    return { kycList: result };
  });

// ── Process KYC ─────────────────────────────────────────
export const processKyc = createServerFn({ method: "POST" })
  .validator((data: { kycId: number; action: "approved" | "rejected"; reason?: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();

    const { kycId, action, reason } = data;

    const result = await db.select().from(kyc).where(eq(kyc.id, kycId));
    if (result.length === 0) throw new Error("KYC submission not found");

    await db
      .update(kyc)
      .set({
        status: action,
        rejectionReason: action === "rejected" ? reason || null : null,
        verifiedAt: action === "approved" ? new Date() : null,
      })
      .where(eq(kyc.id, kycId));

    return { success: true };
  });
