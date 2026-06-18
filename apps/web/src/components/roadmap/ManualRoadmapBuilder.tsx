"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReactFlow, Controls, Background, BackgroundVariant, Node as FlowNode } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { 
  useGetRoadmap, 
  useCreateRoadmap, 
  useUpdateRoadmap, 
  useDeleteRoadmap,
  useCreateNode,
  useUpdateNode,
  useDeleteNode
} from "@/hooks/useRoadmap";
import { RoadmapNode } from "@/components/roadmap/RoadmapNode";
import { getLayoutedElements } from "@/lib/layout";
import { InitRoadmapDialog } from "./InitRoadmapDialog";
import { NodeEditorSidebar, NodeDraft } from "./NodeEditorSidebar";
import { Plus, Save, Settings, Trash2 } from "lucide-react";

const nodeTypes = {
  roadmapNode: RoadmapNode,
};

interface ManualRoadmapBuilderProps {
  roadmapId?: number;
}

export function ManualRoadmapBuilder({ roadmapId }: ManualRoadmapBuilderProps) {
  const router = useRouter();

  // Load existing roadmap if ID is provided
  const { data: existingRoadmap, isLoading: isLoadingRoadmap } = useGetRoadmap(roadmapId);

  // Roadmap Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(!roadmapId);

  // Canvas State
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [edges, setEdges] = useState<{ source: string; target: string }[]>([]);

  // Sync state
  const [deletedNodeIds, setDeletedNodeIds] = useState<number[]>([]);

  // Editor Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Mutations
  const { mutateAsync: createRoadmap, isPending: isCreatingRoadmap } = useCreateRoadmap();
  const { mutateAsync: updateRoadmap, isPending: isUpdatingRoadmap } = useUpdateRoadmap();
  const { mutateAsync: deleteRoadmap, isPending: isDeletingRoadmap } = useDeleteRoadmap();
  
  const { mutateAsync: createNode } = useCreateNode();
  const { mutateAsync: updateNode } = useUpdateNode();
  const { mutateAsync: deleteNode } = useDeleteNode();

  // Initialize state from existing roadmap
  useEffect(() => {
    if (existingRoadmap) {
      setTitle(existingRoadmap.title || "");
      setDescription(existingRoadmap.description || "");
      setIsInitDialogOpen(false);

      const loadedNodes = existingRoadmap.nodes?.map((n: any) => ({
        ...n,
        id: String(n.id),
      })) || [];
      
      setNodes(loadedNodes);

      const loadedEdges = [];
      for (let i = 0; i < loadedNodes.length - 1; i++) {
        loadedEdges.push({ source: loadedNodes[i].id, target: loadedNodes[i+1].id });
      }
      setEdges(loadedEdges);
    }
  }, [existingRoadmap]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const layoutNodes = nodes.map((n) => ({
      id: n.id!,
      label: n.title,
      description: n.description,
      resources: n.resources,
    }));
    return getLayoutedElements(layoutNodes, edges);
  }, [nodes, edges]);

  const handleInitSubmit = (data: { title: string; description: string }) => {
    setTitle(data.title);
    setDescription(data.description);
  };

  const openAddNode = () => {
    setSelectedNodeId(null);
    setIsSidebarOpen(true);
  };

  const handleNodeClick = (_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
    setIsSidebarOpen(true);
  };

  const handleSaveNode = (nodeDraft: NodeDraft) => {
    if (selectedNodeId) {
      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNodeId ? { ...nodeDraft, id: selectedNodeId } : n))
      );
    } else {
      const newNodeId = `node_${Date.now()}`;
      const newNode = { ...nodeDraft, id: newNodeId };
      setNodes((prev) => [...prev, newNode]);

      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        setEdges((prev) => [...prev, { source: lastNode.id!, target: newNodeId }]);
      }
    }
    setIsSidebarOpen(false);
    setSelectedNodeId(null);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;

    if (!selectedNodeId.startsWith("node_")) {
      setDeletedNodeIds((prev) => [...prev, parseInt(selectedNodeId, 10)]);
    }

    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    
    setEdges((prev) => {
      const incoming = prev.find((e) => e.target === selectedNodeId);
      const outgoing = prev.find((e) => e.source === selectedNodeId);
      const remaining = prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId);
      
      if (incoming && outgoing) {
        remaining.push({ source: incoming.source, target: outgoing.target });
      }
      return remaining;
    });

    setIsSidebarOpen(false);
    setSelectedNodeId(null);
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmapId || !confirm("Are you sure you want to delete this roadmap?")) return;
    
    try {
      await deleteRoadmap(roadmapId);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete roadmap:", err);
      alert("Failed to delete roadmap.");
    }
  };

  const handleSaveRoadmap = async () => {
    if (!title) {
      setIsInitDialogOpen(true);
      return;
    }

    try {
      let finalRoadmapId = roadmapId;

      if (roadmapId) {
        // Upsert Logic: Update existing roadmap
        await updateRoadmap({
          id: roadmapId,
          title,
          description,
        });

        // Handle deleted nodes
        for (const deletedId of deletedNodeIds) {
          await deleteNode(deletedId);
        }
        setDeletedNodeIds([]);

        // Update existing or create new nodes
        for (const node of nodes) {
          if (node.id?.startsWith("node_")) {
            await createNode({
              roadmapId,
              title: node.title,
              description: node.description,
              tags: node.tags,
              resources: node.resources,
            });
          } else {
            await updateNode({
              id: parseInt(node.id!, 10),
              title: node.title,
              description: node.description,
              tags: node.tags,
              resources: node.resources,
            });
          }
        }
      } else {
        // Creation Logic: Create new roadmap
        // TODO: Replace userId with active user session ID
        const roadmapResponse = await createRoadmap({
          title,
          description,
          userId: 1, 
        });

        finalRoadmapId = roadmapResponse.createRoadmap.id;

        for (const node of nodes) {
          await createNode({
            roadmapId: finalRoadmapId!,
            title: node.title,
            description: node.description,
            tags: node.tags,
            resources: node.resources,
          });
        }
      }

      router.push(`/roadmap/${finalRoadmapId}`);
    } catch (error) {
      console.error("Failed to save roadmap", error);
      alert("Failed to save roadmap. See console for details.");
    }
  };

  if (roadmapId && isLoadingRoadmap) {
    return <div className="flex h-full items-center justify-center text-zinc-500">Loading roadmap...</div>;
  }

  const isSaving = isCreatingRoadmap || isUpdatingRoadmap;

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <InitRoadmapDialog
        open={isInitDialogOpen}
        onOpenChange={setIsInitDialogOpen}
        onSubmit={handleInitSubmit}
        initialData={title ? { title, description } : undefined}
      />

      <NodeEditorSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        initialData={selectedNodeData}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />

      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10">
        <div>
          <h1 className="text-xl font-bold">{title || "Untitled Roadmap"}</h1>
          {description && <p className="text-sm text-zinc-400">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInitDialogOpen(true)}
            className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Edit Roadmap Info"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {roadmapId && (
            <button
              onClick={handleDeleteRoadmap}
              disabled={isDeletingRoadmap}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
              title="Delete Roadmap"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={openAddNode}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Node
          </button>

          <button
            onClick={handleSaveRoadmap}
            disabled={isSaving || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-sky-500/20"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Roadmap"}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800 shadow-xl">
              <Plus className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300">Your roadmap is empty</h3>
            <p className="text-sm text-zinc-500 max-w-sm mt-2">
              Start adding nodes to build your learning path step by step.
            </p>
            <button
              onClick={openAddNode}
              className="mt-6 px-6 py-2.5 bg-zinc-50 text-zinc-950 font-medium rounded-xl pointer-events-auto hover:bg-zinc-200 transition-colors"
            >
              Add First Node
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={2}
          >
            <Background color="#27272a" variant={BackgroundVariant.Dots} gap={16} size={2} />
            <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
