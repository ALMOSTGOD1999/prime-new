import { createServerFn } from "@tanstack/react-start";
import { seedAdmin } from "../../lib/auth";

export const seed = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      await seedAdmin();
      return { success: true, message: "Admin seeded successfully" };
    } catch (error: any) {
      throw new Error(error.message || "Seed failed");
    }
  });
