import { createServerFn } from "@tanstack/react-start";
import { getTeamTree } from "../../lib/mlm/engine";
import { getCookie } from "@tanstack/react-start/server";

export const getTeam = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie("auth_token");
    if (!token) throw new Error("Not authenticated");

    const { verifyJwt } = await import("../../lib/auth");
    const payload = verifyJwt(token);
    if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");

    const tree = await getTeamTree(payload.userId, 4);
    return { tree };
  });
