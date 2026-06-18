import { QueryClient } from "@tanstack/react-query";
import { GraphQLClient } from "graphql-request";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Configure the GraphQL client
const API_URL = "http://localhost:3001/graphql";

export const graphQLClient = new GraphQLClient(API_URL, {
  requestMiddleware: (request) => {
    return {
      ...request,
      credentials: "include",
    };
  },
});
