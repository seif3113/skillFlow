import { useState, useCallback, useRef } from 'react';
import { gql } from 'graphql-request';
import { graphQLClient } from '@/lib/graphql-request-client';
import { createClient } from 'graphql-ws';

export interface StreamedNode {
  id: number;
  roadmapId: number;
  title: string;
  description: string | null;
  tags: string[];
  resources: {
    title: string;
    url: string;
    source?: string;
    type?: string;
  }[];
  isCompleted: boolean;
}

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

const ROADMAP_GENERATION_SUBSCRIPTION = gql`
  subscription RoadmapGenerationStream($roadmapId: Int!) {
    roadmapGenerationStream(roadmapId: $roadmapId) {
      event
      message
      node {
        id
        roadmapId
        title
        description
        tags
        isCompleted
        resources {
          title
          url
          source
          type
        }
      }
    }
  }
`;

const GENERATE_ROADMAP_STREAM_MUTATION = gql`
  mutation GenerateRoadmapStream($roadmapId: Int!, $topic: String!, $customizationAnswers: [String!]) {
    generateRoadmapStream(roadmapId: $roadmapId, topic: $topic, customizationAnswers: $customizationAnswers)
  }
`;

const activeGenerations = new Set<number>();

export function useRoadmapStream() {
  const [nodes, setNodes] = useState<StreamedNode[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<() => void | null>(null);

  const startGeneration = useCallback(
    async (roadmapId: number, topic: string, customizationAnswers?: string[]) => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }

      setStatus('connecting');
      setError(null);
      setNodes([]);

      try {
        const wsClient = createClient({
          url: 'ws://localhost:3001/graphql',
        });

        // 1. ALWAYS Subscribe to the stream, even if another instance is mutating
        const unsubscribe = wsClient.subscribe(
          {
            query: ROADMAP_GENERATION_SUBSCRIPTION,
            variables: { roadmapId },
          },
          {
            next: (data) => {
              const streamData = (data.data as any)?.roadmapGenerationStream;
              if (!streamData) return;

              if (streamData.event === 'node' && streamData.node) {
                setStatus('streaming');
                setNodes((prev) => [...prev, streamData.node]);
              } else if (streamData.event === 'done') {
                setStatus('done');
                activeGenerations.delete(roadmapId);
                if (subscriptionRef.current) {
                  subscriptionRef.current();
                  subscriptionRef.current = null;
                }
                wsClient.dispose();
              } else if (streamData.event === 'error') {
                setError(streamData.message || 'Error occurred during generation');
                setStatus('error');
                activeGenerations.delete(roadmapId);
                if (subscriptionRef.current) {
                  subscriptionRef.current();
                  subscriptionRef.current = null;
                }
                wsClient.dispose();
              }
            },
            error: (err) => {
              console.error('Subscription error:', err);
              setError('Subscription error');
              setStatus('error');
              activeGenerations.delete(roadmapId);
            },
            complete: () => {
              // Ignore complete, handled by 'done' event
            },
          }
        );

        subscriptionRef.current = () => {
          unsubscribe();
          wsClient.dispose();
        };

        // 2. Trigger the mutation to start generating ONLY IF not already active
        if (!activeGenerations.has(roadmapId)) {
          activeGenerations.add(roadmapId);
          graphQLClient.request(GENERATE_ROADMAP_STREAM_MUTATION, {
            roadmapId,
            topic,
            customizationAnswers: customizationAnswers || [],
          }).catch((err: any) => {
            console.error('Error in useRoadmapStream mutation:', err);
            setError(err.message || 'An unknown error occurred');
            setStatus('error');
            activeGenerations.delete(roadmapId);
          });
        }

      } catch (err: any) {
        console.error('Error in useRoadmapStream:', err);
        setError(err.message || 'An unknown error occurred');
        setStatus('error');
        activeGenerations.delete(roadmapId);
        if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
        }
      }
    },
    [],
  );

  const stopGeneration = useCallback((roadmapId: number) => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    // We intentionally DO NOT delete from activeGenerations here.
    // If the component unmounts during strict mode, the background generation continues.
    // The server 'done' event or explicit app restart will clear the global state.
    setStatus('idle');
  }, []);

  return { nodes, status, error, startGeneration, stopGeneration };
}
