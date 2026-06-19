import { GraphQLClient } from "graphql-request";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:3001/graphql";

// Minimal graphql-request client. Used only by `useRoadmapStream` to fire the
// `generateRoadmapStream` mutation that kicks off server-side generation; the
// streamed nodes arrive over the graphql-ws subscription. Everything else in
// the app goes through the normalized Apollo client (`@/lib/apollo`).
export const graphQLClient = new GraphQLClient(GRAPHQL_URL, {
  credentials: "include",
});
