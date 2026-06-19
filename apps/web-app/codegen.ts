import type { CodegenConfig } from "@graphql-codegen/cli"

// GraphQL codegen for Apollo Client: emits a single self-contained module of
// `TypedDocumentNode`s (e.g. `FooDocument`) plus their result/variable/input
// types. We use `typescript-operations` (self-contained) WITHOUT the standalone
// `typescript` plugin — having both in one file duplicates input types.
// Apollo's hooks infer everything from the document, so we never pass generics.
const config: CodegenConfig = {
  overwrite: true,
  schema: "../api/src/**/*.graphql",
  documents: ["src/**/*.{ts,tsx,graphql}", "!src/gql/**/*"],
  ignoreNoDocuments: true,
  generates: {
    "./src/gql/graphql.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        // Emit `import type` so output satisfies verbatimModuleSyntax.
        useTypeImports: true,
        // Nullable fields become `T | null` instead of optional `T?`.
        avoidOptionals: { field: true, inputValue: false },
        // Opaque JSON scalar -> `unknown`; narrow per feature (zod / casts).
        defaultScalarType: "unknown",
        scalars: { DateTime: "string" },
        // Apollo always returns __typename; don't synthesize it on root types.
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
  },
}

export default config
