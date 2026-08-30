import { createServerFn } from "@tanstack/react-start";
import { clearAuthCookie } from "../../lib/auth";

export const logout = createServerFn({ method: "POST" })
  .handler(async () => {
    return { success: true, cookie: clearAuthCookie() };
  });
