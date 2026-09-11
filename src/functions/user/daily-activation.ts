import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Daily ID activation reward ────────────────────────
// Users can activate their ID once daily between 12PM-12AM
export const activateDailyReward = createServerFn({ method: "POST" })
  .handler(async () => {
    const { dailyActivationReward } = await import("../../lib/mlm/engine");
    const userId = await getAuthUserId();
    return await dailyActivationReward(userId);
  });

// ── Get daily activation status ───────────────────────
export const getDailyActivationStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getDailyActivationStatus: getStatus } = await import("../../lib/mlm/engine");
    const userId = await getAuthUserId();
    return await getStatus(userId);
  });
