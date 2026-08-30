import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { verifyPassword, signJwt } from "../../lib/auth";
import { eq } from "drizzle-orm";

export const login = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result[0];
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const token = signJwt({
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
