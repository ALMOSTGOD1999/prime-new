import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, wallet } from "../../lib/db/schema";
import { activateUser } from "../../lib/mlm/engine";
import { eq } from "drizzle-orm";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export const activate = createServerFn({ method: "POST" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = await verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    try {
      const result = await activateUser(payload.userId);
      return { success: true, ...result };
    } catch (error: any) {
      throw new Error(error.message || "Activation failed");
    }
  });
