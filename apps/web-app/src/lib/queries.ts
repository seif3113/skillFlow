import { gql } from "@apollo/client"
import type { PublicRoadmapsQuery } from "@/gql/graphql"

// Smoke test for the Apollo + codegen base. The operation is defined inside
// `if (false)` purely so codegen extracts it and emits `PublicRoadmapsDocument`
// + types (the dead branch is dropped by the bundler). This folds into the
// roadmaps feature when we map it.
if (false) {
  gql`
    query PublicRoadmaps {
      publicRoadmaps {
        id
        userName
        title
        description
        isPublished
      }
    }
  `
}

// Compile-time proof that codegen produced usable, inferred types.
export type SmokePublicRoadmap = PublicRoadmapsQuery["publicRoadmaps"][number]
