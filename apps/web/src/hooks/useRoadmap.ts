"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import {
  GetRoadmapDocument,
  RoadmapsByUserDocument,
  SearchNodeResourcesDocument,
  PublicRoadmapsDocument,
  CreateRoadmapDocument,
  UpdateRoadmapDocument,
  DeleteRoadmapDocument,
  CreateNodeDocument,
  UpdateNodeDocument,
  DeleteNodeDocument,
  PublishRoadmapDocument,
  GetPublicRoadmapDocument,
  RoadmapCustomizationQuestionsDocument,
  NodeChatsDocument,
  ForkRoadmapDocument,
  UpdateRoadmapAiDocument,
  SendNodeChatMessageDocument,
} from "@/lib/gql/graphql";

// ----------------------------------------------------------------------
// Typed wrappers over Apollo's generated documents. Query hooks unwrap the
// Apollo result to the payload components actually need; mutation hooks just
// return Apollo's native `useMutation` tuple (with refetch config baked in),
// so callers use `const [fn, { loading }] = useX()` and `fn({ variables })`.
// Everything sits on the normalized Apollo cache + fully-typed documents.
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// QUERIES
// ----------------------------------------------------------------------

export function useGetRoadmap(id?: number) {
  const { data, loading, error, refetch } = useQuery(GetRoadmapDocument, {
    variables: { id: id ?? 0 },
    skip: !id,
  });
  return {
    data: data?.roadmap ?? null,
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}

export function useRoadmapsByUser(userId?: number) {
  const { data, loading, error, refetch } = useQuery(RoadmapsByUserDocument, {
    variables: { userId: userId ?? 0 },
    skip: !userId,
  });
  return {
    data: data?.roadmapsByUser ?? [],
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}

export function useSearchNodeResources(
  topic: string,
  limit: number = 5,
  type?: string,
) {
  const { data, loading, error } = useQuery(SearchNodeResourcesDocument, {
    variables: { topic, limit, type: type || undefined },
    // Only run once we have a meaningful topic.
    skip: !topic || topic.length <= 2,
    notifyOnNetworkStatusChange: true,
  });
  return {
    data: data?.searchNodeResources ?? [],
    isLoading: loading,
    isFetching: loading,
    error,
  };
}

export function useGetPublicRoadmaps() {
  const { data, loading, error, refetch } = useQuery(PublicRoadmapsDocument);
  return {
    data: data?.publicRoadmaps ?? [],
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}

// ----------------------------------------------------------------------
// MUTATIONS
// ----------------------------------------------------------------------

export function useCreateRoadmap() {
  return useMutation(CreateRoadmapDocument, {
    refetchQueries: ["RoadmapsByUser"],
  });
}

// Normalized cache auto-updates the roadmap entity by id; no refetch needed.
export function useUpdateRoadmap() {
  return useMutation(UpdateRoadmapDocument);
}

export function useDeleteRoadmap() {
  return useMutation(DeleteRoadmapDocument, {
    refetchQueries: ["RoadmapsByUser", "PublicRoadmaps"],
  });
}

export function useCreateNode() {
  return useMutation(CreateNodeDocument);
}

export function useUpdateNode() {
  return useMutation(UpdateNodeDocument);
}

export function useDeleteNode() {
  return useMutation(DeleteNodeDocument);
}

export function usePublishRoadmap() {
  return useMutation(PublishRoadmapDocument, {
    refetchQueries: ["PublicRoadmaps"],
  });
}

// ----------------------------------------------------------------------
// QUERIES / MUTATIONS re-added on Apollo after the main merge.
// These back the AI-chat, AI-edit, fork, and customization-question
// features that live on `main`. Shapes mirror the previous react-query
// hooks so the consuming components compile unchanged.
// ----------------------------------------------------------------------

export function useGetPublicRoadmap(id?: number) {
  const { data, loading, error, refetch } = useQuery(GetPublicRoadmapDocument, {
    variables: { id: id ?? 0 },
    skip: !id,
  });
  return {
    data: data?.publicRoadmap ?? null,
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}

export function useRoadmapCustomizationQuestions(
  message: string,
  enabled: boolean = false,
) {
  const { data, loading, error, refetch } = useQuery(
    RoadmapCustomizationQuestionsDocument,
    {
      variables: { message },
      skip: !enabled || !message,
    },
  );
  // Callers `await fetchQuestions()` then read `res.data.length`, so unwrap the
  // Apollo result down to the questions array to match the old hook's contract.
  const unwrappedRefetch = async () => {
    const res = await refetch();
    return { ...res, data: res.data?.roadmapCustomizationQuestions ?? [] };
  };
  return {
    data: data?.roadmapCustomizationQuestions ?? [],
    isLoading: loading,
    isFetching: loading,
    error,
    refetch: unwrappedRefetch,
  };
}

export function useNodeChats(nodeId?: number, userId?: number) {
  const { data, loading, error, refetch } = useQuery(NodeChatsDocument, {
    variables: { nodeId: nodeId ?? 0, userId: userId ?? 0 },
    skip: !nodeId || !userId,
  });
  return {
    data: data?.nodeChats ?? [],
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}

export function useForkRoadmap() {
  return useMutation(ForkRoadmapDocument, {
    refetchQueries: ["RoadmapsByUser", "PublicRoadmaps"],
  });
}

export function useUpdateRoadmapAi() {
  return useMutation(UpdateRoadmapAiDocument);
}

// The backend persists both the user message and the AI reply, so refetch the
// chat thread (and wait for it) to surface the assistant's response.
export function useSendNodeChatMessage() {
  return useMutation(SendNodeChatMessageDocument, {
    refetchQueries: ["NodeChats"],
    awaitRefetchQueries: true,
  });
}
