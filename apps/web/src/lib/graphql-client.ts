import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

export const graphqlClient = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:3001/graphql", // Mercurius endpoint
  }),
  cache: new InMemoryCache(),
});
