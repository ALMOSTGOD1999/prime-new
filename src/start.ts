import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { verifyJwt, getTokenFromRequest } from "./lib/auth";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Auth middleware: extract userId from JWT cookie into context
const authMiddleware = createMiddleware().server(async ({ next, context }) => {
  const request = context.request;
  const token = getTokenFromRequest(request);
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && typeof payload.userId === "number") {
      const ctx = context as Record<string, unknown>;
      ctx["userId"] = payload.userId;
      ctx["userEmail"] = payload.email as string;
      ctx["userName"] = payload.name as string;
      ctx["isAdmin"] = payload.isAdmin as boolean;
      ctx["impersonatorId"] = payload.impersonatorId as number | undefined;
    }
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware, authMiddleware],
}));
