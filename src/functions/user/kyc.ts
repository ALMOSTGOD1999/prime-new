import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { kyc } from "../../lib/db/schema";
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

// ── Submit KYC ──────────────────────────────────────────
export const submitKyc = createServerFn({ method: "POST" })
  .validator((data: {
    panNumber: string;
    aadhaarNumber: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    if (!data.panNumber || !data.aadhaarNumber || !data.bankName || !data.accountNumber || !data.ifscCode) {
      throw new Error("All fields are required");
    }

    // Upsert KYC
    const existing = await db.select().from(kyc).where(eq(kyc.userId, userId));

    if (existing.length > 0) {
      await db
        .update(kyc)
        .set({
          panNumber: data.panNumber,
          aadhaarNumber: data.aadhaarNumber,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          status: "pending",
          rejectionReason: null,
        })
        .where(eq(kyc.userId, userId));
    } else {
      await db.insert(kyc).values({
        userId,
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        status: "pending",
      });
    }

    return { success: true };
  });

// ── Get KYC status ──────────────────────────────────────
export const getKycStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const result = await db.select().from(kyc).where(eq(kyc.userId, userId));

    if (result.length === 0) {
      return { kyc: null, status: "not_submitted" };
    }

    const kycData = result[0]!;
    return {
      kyc: {
        panNumber: kycData.panNumber,
        aadhaarNumber: kycData.aadhaarNumber,
        bankName: kycData.bankName,
        accountNumber: kycData.accountNumber,
        ifscCode: kycData.ifscCode,
        status: kycData.status,
        rejectionReason: kycData.rejectionReason,
        createdAt: kycData.createdAt,
      },
      status: kycData.status,
    };
  });
