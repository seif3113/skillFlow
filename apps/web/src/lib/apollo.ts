import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:3001/graphql";

// Single client instance. Apollo's normalized cache keys entities by
// `__typename` + `id`, so mutating a Node/Roadmap updates it everywhere it
// is rendered (editor, dashboard, public views) without manual refetches.
export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: GRAPHQL_URL,
    credentials: "include",
  }),
  cache: new InMemoryCache(),
});
