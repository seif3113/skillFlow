"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RoadmapNode } from "./RoadmapNode";
import { useMemo } from "react";

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'roadmapNode',
    position: { x: 0, y: 0 },
    data: { 
      label: 'React Fundamentals', 
      description: 'Master JSX, Props, and State basics.',
      resources: [{ title: 'Official Docs', url: '#' }],
      completed: true 
    },
  },
  {
    id: '2',
    type: 'roadmapNode',
    position: { x: 0, y: 200 },
    data: { 
      label: 'Advanced Hooks', 
      description: 'Deep dive into useEffect, useMemo, and useCallback.',
      resources: [{ title: 'Hooks Guide', url: '#' }],
      completed: false 
    },
  },
  {
    id: '3',
    type: 'roadmapNode',
    position: { x: 300, y: 100 },
    data: { 
      label: 'State Management', 
      description: 'Explore Context API and modern libraries.',
      resources: [{ title: 'Zustand Docs', url: '#' }],
      completed: false 
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
];

export function RoadmapPreview() {
  const nodeTypes: NodeTypes = useMemo(() => ({
    roadmapNode: RoadmapNode,
  }), []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="dark:opacity-20 opacity-40"
          color="currentColor"
        />
      </ReactFlow>
    </div>
  );
}
