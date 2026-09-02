import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { verifyPassword, signJwt } from "../../lib/auth";
import { eq, or } from "drizzle-orm";

export const login = createServerFn({ method: "POST" })
  .validator((data: { userId: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { userId, password } = data;

    if (!userId || !password) {
      throw new Error("User ID and password are required");
    }

    // Look up by email OR referral code
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        passwordHash: users.passwordHash,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
      })
      .from(users)
      .where(or(eq(users.email, userId), eq(users.referralCode, userId)));

    if (result.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result[0]!;
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
      },
      token,
    };
  });
