import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet } from "../../lib/db/schema";
import { hashPassword, generateReferralCode, signJwt, setAuthCookie } from "../../lib/auth";
import { eq } from "drizzle-orm";
import { autoPlace } from "../../lib/mlm/engine";

export const signup = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; password: string; referralCode?: string }) => data)
  .handler(async ({ data }) => {
    const { name, email, password, referralCode } = data;

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      throw new Error("Email already registered");
    }

    const passwordHash = await hashPassword(password);

    // Find referrer if referral code provided
    let referredBy: number | null = null;
    if (referralCode) {
      const referrer = await db.select().from(users).where(eq(users.referralCode, referralCode));
      if (referrer.length === 0) {
        throw new Error("Invalid referral code");
      }
      referredBy = referrer[0].id;
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        referralCode: "TEMP",
        referredBy,
      })
      .returning();

    // Update referral code to be based on user id
    const code = generateReferralCode(newUser.id);
    await db.update(users).set({ referralCode: code }).where(eq(users.id, newUser.id));

    // Create wallet
    await db.insert(wallet).values({ userId: newUser.id, balance: 0, totalEarned: 0 });

    // Place in binary tree if referrer exists
    if (referredBy) {
      try {
        await autoPlace(newUser.id, referredBy);
      } catch {
        // Tree placement is best-effort
      }
    }

    // Sign JWT
    const token = await signJwt({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
    });

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        referralCode: code,
        isAdmin: newUser.isAdmin,
      },
      token,
    };
  });
