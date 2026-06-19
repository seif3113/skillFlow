import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { authClient, type SessionUser } from "./client"

// Resolves the current user on the server. TanStack Start loaders/SSR have no
// browser cookie, so we forward the incoming request's headers (the better-auth
// session cookie among them) to the API's get-session endpoint.
//
// Returns null on any failure (no session, or API unreachable) so the guard
// degrades to "logged out" instead of crashing the render.
export const fetchUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    try {
      const headers = getRequestHeaders()
      const { data } = await authClient.getSession({
        fetchOptions: { headers: headers as HeadersInit },
      })
      return data?.user ?? null
    } catch {
      return null
    }
  },
)
