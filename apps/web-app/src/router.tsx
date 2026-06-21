import {
  routerWithApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-tanstack-start"
import { ApolloLink, HttpLink, Observable } from "@apollo/client"
import { split } from "@apollo/client/link"
import { SetContextLink } from "@apollo/client/link/context"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { getMainDefinition } from "@apollo/client/utilities"
import { createClient } from "graphql-ws"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import { attachApiError } from "@/lib/api-error"
import { routeTree } from "./routeTree.gen"

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:3001/graphql"
const GRAPHQL_WS_URL =
  import.meta.env.VITE_GRAPHQL_WS_URL ?? GRAPHQL_URL.replace(/^http/, "ws")

/**
 * Apollo link that intercepts the server's custom error body:
 *   { data: null, error: { message: string, status: number } }
 * and attaches the typed ApiError onto any thrown error so that
 * every catch site can call `getApiError(e)` to retrieve it.
 *
 * Uses new Observable + subscribe() because Apollo Client v4's Observable
 * does not expose a .map() method.
 */
const apiErrorLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    const sub = forward(operation).subscribe({
      next: (response) => {
        const body = response as any
        // The server sends { data: null, error: { message, status } } for errors.
        // Apollo sees it as a successful response (HTTP 200) with a null data
        // field, so we convert it into a real error here.
        if (body?.error?.message) {
          const err = new Error(body.error.message)
          attachApiError(err, {
            message: body.error.message,
            status: body.error.status ?? 500,
          })
          observer.error(err)
        } else {
          observer.next(response)
        }
      },
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    })
    return () => sub.unsubscribe()
  })
})

/**
 * `credentials: "include"` on HttpLink only works in the browser — it tells
 * the browser to attach cookies from its own cookie jar. During SSR there is
 * no cookie jar, so without this link, every loader/SSR request goes out
 * with zero cookies and looks logged-out even when the browser is signed in.
 *
 * Server: forward the incoming request's Cookie header onto the outgoing
 * GraphQL request.
 * Client: no-op — the browser already attaches cookies via credentials: "include".
 */
const authLink = createIsomorphicFn()
  .server(() =>
    new SetContextLink((prevContext) => {
      const cookie = getRequestHeader("cookie")
      return {
        headers: {
          ...prevContext.headers,
          ...(cookie ? { cookie } : {}),
        },
      }
    }),
  )
  .client(() => new SetContextLink((prevContext) => prevContext))()

// `getRouter` runs on both server and client, so keep it environment-agnostic.
export function getRouter() {
  const httpLink = new HttpLink({ uri: GRAPHQL_URL, credentials: "include" })

  // Subscriptions (live roadmap generation) need a WebSocket, which only
  // exists in the browser. During SSR we use the HTTP link alone — loaders
  // never run subscriptions. On the client we route subscription operations to
  // the WS link and everything else to HTTP.
  const link =
    typeof window === "undefined"
      ? httpLink
      : split(
          ({ query }) => {
            const def = getMainDefinition(query)
            return (
              def.kind === "OperationDefinition" &&
              def.operation === "subscription"
            )
          },
          new GraphQLWsLink(createClient({ url: GRAPHQL_WS_URL })),
          httpLink,
        )

  const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    // authLink first so its headers (cookie, on the server) are in context
    // before the request hits apiErrorLink and the terminating link.
    link: ApolloLink.from([authLink, apiErrorLink, link]),
  })

  const router = createTanStackRouter({
    routeTree,
    context: { ...routerWithApolloClient.defaultContext },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return routerWithApolloClient(router, apolloClient)
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}