import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

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

// Configure CSRF protection:
// 1. Only enforce CSRF on mutation requests (POST, PUT, DELETE, PATCH). GET/HEAD are idempotent queries.
// 2. Allow all requests from trusted production and preview domains (*.vercel.app, *.onrender.com, localhost).
// 3. Allow requests without origin check when proxied through Vercel serverless.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => {
    if (ctx.handlerType !== "serverFn") return false;
    const method = (ctx.request.method || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
    return true;
  },
  origin: (origin) => {
    if (!origin) return true;
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".vercel.app") ||
        host.endsWith(".onrender.com") ||
        host.includes("acudigiverse")
      );
    } catch {
      return false;
    }
  },
  secFetchSite: () => true,
  referer: (referer) => {
    if (!referer) return true;
    try {
      const url = new URL(referer);
      const host = url.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".vercel.app") ||
        host.endsWith(".onrender.com") ||
        host.includes("acudigiverse")
      );
    } catch {
      return true;
    }
  },
  allowRequestsWithoutOriginCheck: true,
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
