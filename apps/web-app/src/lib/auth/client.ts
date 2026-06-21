import { createAuthClient } from "better-auth/react"

// Use a relative path so the auth client always hits the *same origin* as the
// frontend. In dev the Vite proxy forwards /api/auth/* → the NestJS server,
// and in production a Nitro route handler does the same. This is the
// TanStack-Start equivalent of Next.js rewrites and is what prevents the
// OAuth state_mismatch error.
const baseURL = "/api/auth"

export const authClient = createAuthClient({ baseURL })

// The authenticated user shape (incl. the API's `preferences` additional field),
// inferred straight from the better-auth client.
export type SessionUser = typeof authClient.$Infer.Session.user
