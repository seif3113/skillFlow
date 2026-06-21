import { createFileRoute } from "@tanstack/react-router"

// The direct API URL — only used server-side, so it's safe to point straight
// at the NestJS deployment without going through Vercel rewrites.
const API_GRAPHQL_URL = process.env.VITE_SERVER_URL
  ? `${process.env.VITE_SERVER_URL.replace(/\/$/, "")}/graphql`
  : "https://skill-flow-api.vercel.app/graphql"

/**
 * Server-side GraphQL proxy.
 *
 * WHY THIS EXISTS:
 * Vercel rewrites that target external domains (e.g. skill-flow-api.vercel.app)
 * strip the `Cookie` header for cross-origin security reasons. That means the
 * browser's session cookie never reached the NestJS API, causing every
 * authenticated GraphQL request to return 401 Unauthorized.
 *
 * This Nitro/TanStack Start server handler runs on the same origin as the
 * frontend, so the browser sends its cookie normally (same-origin request).
 * The handler then explicitly forwards the cookie to the real API.
 *
 * Supports both HTTP (queries/mutations) and the Upgrade: websocket path is
 * handled separately by the client-side WS link.
 */
export const Route = createFileRoute("/api/graphql")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie")
        const contentType =
          request.headers.get("content-type") ?? "application/json"

        const body = await request.arrayBuffer()

        const upstreamResponse = await fetch(API_GRAPHQL_URL, {
          method: "POST",
          headers: {
            "content-type": contentType,
            accept: request.headers.get("accept") ?? "application/json",
            ...(cookie ? { cookie } : {}),
          },
          body,
        })

        // Forward the response as-is, preserving content-type and status.
        const responseBody = await upstreamResponse.arrayBuffer()
        return new Response(responseBody, {
          status: upstreamResponse.status,
          headers: {
            "content-type":
              upstreamResponse.headers.get("content-type") ??
              "application/json",
          },
        })
      },

      // Some GraphQL clients send OPTIONS preflight — just respond OK.
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { allow: "POST, OPTIONS" },
        }),
    },
  },
})
