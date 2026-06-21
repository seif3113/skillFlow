import { createAuthClient } from "better-auth/react"

// Talks to the NestJS better-auth instance mounted at /api/auth on the API.
// const baseURL =
// import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:3001/api/auth"


export const authClient = createAuthClient({
  // Use current origin to leverage Vercel rewrites
  // This makes auth cookies First-Party and fixes state_mismatch
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  fetchOptions: {
    credentials: "include",
  },
  // Required for cross-domain auth if not using same domain,
  // but with rewrites we are effectively on the same domain.
  disableCookieCache: true,
})

// The authenticated user shape (incl. the API's `preferences` additional field),
// inferred straight from the better-auth client.
export type SessionUser = typeof authClient.$Infer.Session.user
