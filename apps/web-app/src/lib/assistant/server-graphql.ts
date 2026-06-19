import { print } from "graphql"
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

// The NestJS GraphQL endpoint. Server-side we can't read import.meta.env, so we
// fall back to the same default the browser client uses.
const GRAPHQL_URL =
  process.env.VITE_GRAPHQL_URL ??
  process.env.GRAPHQL_URL ??
  "http://localhost:3001/graphql"

// Executes a generated typed operation against the API as the current user, by
// forwarding their better-auth session cookie. Every assistant tool goes
// through this, so the API's ownership + validation rules still apply.
export async function serverGraphQL<TData, TVars>(
  document: TypedDocumentNode<TData, TVars>,
  variables: TVars,
  cookie: string | null
): Promise<TData> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ query: print(document), variables }),
  })

  const json = (await res.json()) as {
    data?: TData
    errors?: Array<{ message: string }>
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "))
  }
  if (!json.data) {
    throw new Error("Empty GraphQL response")
  }
  return json.data
}
