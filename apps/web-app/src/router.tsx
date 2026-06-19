import {
  routerWithApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-tanstack-start"
import { HttpLink } from "@apollo/client"
import { split } from "@apollo/client/link"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { getMainDefinition } from "@apollo/client/utilities"
import { createClient } from "graphql-ws"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:3001/graphql"
const GRAPHQL_WS_URL =
  import.meta.env.VITE_GRAPHQL_WS_URL ?? GRAPHQL_URL.replace(/^http/, "ws")

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
    link,
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
