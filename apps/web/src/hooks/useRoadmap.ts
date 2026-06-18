import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { graphQLClient } from "@/lib/react-query";

// ----------------------------------------------------------------------
// GRAPHQL QUERIES & MUTATIONS
// ----------------------------------------------------------------------

const GET_ROADMAP = gql`
  query GetRoadmap($id: Int!) {
    roadmap(id: $id) {
      id
      title
      description
      isPublished
      nodes {
        id
        title
        description
        tags
        resources
        isCompleted
      }
    }
  }
`;

const ROADMAPS_BY_USER = gql`
  query RoadmapsByUser($userId: Int!) {
    roadmapsByUser(userId: $userId) {
      id
      title
      description
      isPublished
      createdAt
      updatedAt
      nodes {
        id
        isCompleted
      }
    }
  }
`;

const SEARCH_NODE_RESOURCES = gql`
  query SearchNodeResources($topic: String!, $limit: Int, $type: String) {
    searchNodeResources(topic: $topic, limit: $limit, type: $type)
  }
`;

const CREATE_ROADMAP = gql`
  mutation CreateRoadmap($input: CreateRoadmapInput!) {
    createRoadmap(input: $input) {
      id
      title
      description
    }
  }
`;

const UPDATE_ROADMAP = gql`
  mutation UpdateRoadmap($input: UpdateRoadmapInput!) {
    updateRoadmap(input: $input) {
      id
      title
      description
    }
  }
`;

const DELETE_ROADMAP = gql`
  mutation DeleteRoadmap($id: Int!) {
    deleteRoadmap(id: $id) {
      success
      message
    }
  }
`;

const CREATE_NODE = gql`
  mutation CreateNode($input: CreateNodeInput!) {
    createNode(input: $input) {
      id
      title
      description
      tags
      resources
      isCompleted
    }
  }
`;

const UPDATE_NODE = gql`
  mutation UpdateNode($input: UpdateNodeInput!) {
    updateNode(input: $input) {
      id
      title
      description
      tags
      resources
      isCompleted
    }
  }
`;

const DELETE_NODE = gql`
  mutation DeleteNode($id: Int!) {
    deleteNode(id: $id) {
      success
      message
    }
  }
`;

const PUBLISH_ROADMAP = gql`
  mutation PublishRoadmap($id: Int!) {
    publishRoadmap(id: $id) {
      id
      title
      description
      isPublished
    }
  }
`;

const PUBLIC_ROADMAPS = gql`
  query PublicRoadmaps {
    publicRoadmaps {
      id
      userName
      title
      description
      isPublished
      createdAt
      updatedAt
      nodes {
        id
        title
        description
        tags
        resources
        isCompleted
      }
    }
  }
`;

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface CreateRoadmapInput {
  userId: number;
  title: string;
  description?: string;
  learningProfileId?: number;
  isPublished?: boolean;
}

interface UpdateRoadmapInput {
  id: number;
  userId?: number;
  title?: string;
  description?: string;
  learningProfileId?: number;
  isPublished?: boolean;
}

interface CreateNodeInput {
  roadmapId: number;
  title: string;
  description?: string;
  tags?: any;
  resources?: any;
  isCompleted?: boolean;
}

interface UpdateNodeInput {
  id: number;
  roadmapId?: number;
  title?: string;
  description?: string;
  tags?: any;
  resources?: any;
  isCompleted?: boolean;
}

// ----------------------------------------------------------------------
// HOOKS
// ----------------------------------------------------------------------

export function useGetRoadmap(id?: number) {
  return useQuery({
    queryKey: ["roadmap", id],
    queryFn: async () => {
      if (!id) return null;
      const data: any = await graphQLClient.request(GET_ROADMAP, { id });
      return data.roadmap;
    },
    enabled: !!id,
  });
}

export function useRoadmapsByUser(userId?: number) {
  return useQuery({
    queryKey: ["roadmaps", userId],
    queryFn: async () => {
      if (!userId) return [];
      const data: any = await graphQLClient.request(ROADMAPS_BY_USER, {
        userId,
      });
      return data.roadmapsByUser || [];
    },
    enabled: !!userId,
  });
}

export function useSearchNodeResources(topic: string, limit: number = 5, type?: string) {
  return useQuery({
    queryKey: ["searchNodeResources", topic, limit, type],
    queryFn: async () => {
      if (!topic) return [];
      const data: any = await graphQLClient.request(SEARCH_NODE_RESOURCES, {
        topic,
        limit,
        type: type || undefined,
      });
      return data.searchNodeResources || [];
    },
    enabled: !!topic && topic.length > 2, // Only run if we have a real topic
  });
}

export function useCreateRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoadmapInput) => {
      return await graphQLClient.request(CREATE_ROADMAP, { input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
    },
  });
}

export function useUpdateRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRoadmapInput) => {
      return await graphQLClient.request(UPDATE_ROADMAP, { input });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      if (data?.updateRoadmap?.id) {
        queryClient.invalidateQueries({
          queryKey: ["roadmap", data.updateRoadmap.id],
        });
      }
    },
  });
}

export function useDeleteRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await graphQLClient.request(DELETE_ROADMAP, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
    },
  });
}

export function useCreateNode() {
  return useMutation({
    mutationFn: async (input: CreateNodeInput) => {
      return await graphQLClient.request(CREATE_NODE, { input });
    },
  });
}

export function useUpdateNode() {
  return useMutation({
    mutationFn: async (input: UpdateNodeInput) => {
      return await graphQLClient.request(UPDATE_NODE, { input });
    },
  });
}

export function useDeleteNode() {
  return useMutation({
    mutationFn: async (id: number) => {
      return await graphQLClient.request(DELETE_NODE, { id });
    },
  });
}

export function usePublishRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await graphQLClient.request(PUBLISH_ROADMAP, { id });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["roadmap", data.publishRoadmap.id],
      });
    },
  });
}

export function useGetPublicRoadmaps() {
  return useQuery({
    queryKey: ["publicRoadmaps"],
    queryFn: async () => {
      const data: any = await graphQLClient.request(PUBLIC_ROADMAPS);
      return data.publicRoadmaps || [];
    },
  });
}
