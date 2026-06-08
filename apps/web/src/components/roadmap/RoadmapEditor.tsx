"use client";

import { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RoadmapNode, type RoadmapNodeData } from "./RoadmapNode";
import { NodeSheet } from "./NodeSheet";

interface RoadmapEditorProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onNodeUpdate?: (nodeId: string, data: Partial<RoadmapNodeData>) => void;
}

export function RoadmapEditor({
  initialNodes,
  initialEdges,
  onNodesChange: onNodesChangeProp,
  onNodeUpdate,
}: RoadmapEditorProps) {
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      roadmapNode: RoadmapNode,
    }),
    []
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      handleNodesChange(changes);
      // Notify parent of position changes after drag
      const dragChanges = changes.filter(
        (c) => c.type === "position" && c.dragging === false
      );
      if (dragChanges.length > 0 && onNodesChangeProp) {
        // Use setTimeout to get updated nodes state
        setTimeout(() => {
          setNodes((currentNodes) => {
            onNodesChangeProp(currentNodes);
            return currentNodes;
          });
        }, 0);
      }
    },
    [handleNodesChange, onNodesChangeProp, setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      handleEdgesChange(changes);
    },
    [handleEdgesChange]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSheetOpen(true);
  }, []);

  const handleNodeSave = useCallback(
    (nodeId: string, data: Partial<RoadmapNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        })
      );

      if (onNodeUpdate) {
        onNodeUpdate(nodeId, data);
      }
    },
    [setNodes, onNodeUpdate]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 1 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="roadmap-flow"
      >
        <Controls
          className="bg-zinc-800! border-zinc-700! rounded-lg! [&>button]:bg-zinc-800! [&>button]:border-zinc-700! [&>button]:text-zinc-300! [&>button:hover]:bg-zinc-700!"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#3f3f46"
        />
      </ReactFlow>

      <NodeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        nodeId={selectedNodeId}
        nodeData={selectedNode?.data as unknown as RoadmapNodeData | null}
        onSave={handleNodeSave}
      />
    </div>
  );
}

