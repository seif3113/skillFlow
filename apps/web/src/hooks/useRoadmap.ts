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
  type CreateRoadmapInput,
  type UpdateRoadmapInput,
  type CreateNodeInput,
  type UpdateNodeInput,
} from "@/lib/gql/graphql";

// ----------------------------------------------------------------------
// Thin adapters over Apollo's typed hooks. They preserve the
// `{ data, isLoading }` / `{ mutate, mutateAsync, isPending }` shape the
// existing components consume, while everything underneath is now the
// normalized Apollo cache + fully-typed documents generated from the schema.
// ----------------------------------------------------------------------

type MutationCallbacks<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
};

// Wraps an async runner into a TanStack-Query-style mutation result.
function asMutation<TArgs, TData>(
  runner: (args: TArgs) => Promise<TData>,
  loading: boolean,
) {
  return {
    mutateAsync: runner,
    mutate: (args: TArgs, callbacks?: MutationCallbacks<TData>) => {
      runner(args)
        .then((data) => callbacks?.onSuccess?.(data))
        .catch((error) => callbacks?.onError?.(error));
    },
    isPending: loading,
  };
}

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
  const [mutate, { loading }] = useMutation(CreateRoadmapDocument);
  return asMutation(async (input: CreateRoadmapInput) => {
    const res = await mutate({
      variables: { input },
      refetchQueries: ["RoadmapsByUser"],
    });
    if (!res.data) throw new Error("createRoadmap returned no data");
    return res.data;
  }, loading);
}

export function useUpdateRoadmap() {
  const [mutate, { loading }] = useMutation(UpdateRoadmapDocument);
  // Normalized cache auto-updates the roadmap entity by id; no refetch needed.
  return asMutation(async (input: UpdateRoadmapInput) => {
    const res = await mutate({ variables: { input } });
    if (!res.data) throw new Error("updateRoadmap returned no data");
    return res.data;
  }, loading);
}

export function useDeleteRoadmap() {
  const [mutate, { loading }] = useMutation(DeleteRoadmapDocument);
  return asMutation(async (id: number) => {
    const res = await mutate({
      variables: { id },
      refetchQueries: ["RoadmapsByUser", "PublicRoadmaps"],
    });
    if (!res.data) throw new Error("deleteRoadmap returned no data");
    return res.data;
  }, loading);
}

export function useCreateNode() {
  const [mutate, { loading }] = useMutation(CreateNodeDocument);
  return asMutation(async (input: CreateNodeInput) => {
    const res = await mutate({ variables: { input } });
    if (!res.data) throw new Error("createNode returned no data");
    return res.data;
  }, loading);
}

export function useUpdateNode() {
  const [mutate, { loading }] = useMutation(UpdateNodeDocument);
  return asMutation(async (input: UpdateNodeInput) => {
    const res = await mutate({ variables: { input } });
    if (!res.data) throw new Error("updateNode returned no data");
    return res.data;
  }, loading);
}

export function useDeleteNode() {
  const [mutate, { loading }] = useMutation(DeleteNodeDocument);
  return asMutation(async (id: number) => {
    const res = await mutate({ variables: { id } });
    if (!res.data) throw new Error("deleteNode returned no data");
    return res.data;
  }, loading);
}

export function usePublishRoadmap() {
  const [mutate, { loading }] = useMutation(PublishRoadmapDocument);
  return asMutation(async (id: number) => {
    const res = await mutate({
      variables: { id },
      refetchQueries: ["PublicRoadmaps"],
    });
    if (!res.data) throw new Error("publishRoadmap returned no data");
    return res.data;
  }, loading);
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
  const [mutate, { loading }] = useMutation(ForkRoadmapDocument);
  return asMutation(
    async ({ id, userId }: { id: number; userId: number }) => {
      const res = await mutate({
        variables: { id, userId },
        refetchQueries: ["RoadmapsByUser", "PublicRoadmaps"],
      });
      if (!res.data) throw new Error("forkRoadmap returned no data");
      return res.data;
    },
    loading,
  );
}

export function useUpdateRoadmapAi() {
  const [mutate, { loading }] = useMutation(UpdateRoadmapAiDocument);
  return asMutation(
    async ({ id, message }: { id: number; message: string }) => {
      const res = await mutate({ variables: { id, message } });
      if (!res.data) throw new Error("updateRoadmapAi returned no data");
      return res.data.updateRoadmapAi;
    },
    loading,
  );
}

export function useSendNodeChatMessage() {
  const [mutate, { loading }] = useMutation(SendNodeChatMessageDocument);
  return asMutation(
    async ({
      nodeId,
      userId,
      sender,
      message,
    }: {
      nodeId: number;
      userId: number;
      sender: string;
      message: unknown;
    }) => {
      const res = await mutate({
        variables: { nodeId, userId, sender, message },
        // The backend persists both the user message and the AI reply, so
        // refetch the chat thread to surface the assistant's response.
        refetchQueries: ["NodeChats"],
        awaitRefetchQueries: true,
      });
      if (!res.data) throw new Error("sendNodeChatMessage returned no data");
      return res.data.sendNodeChatMessage;
    },
    loading,
  );
}
