"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGetPublicRoadmap } from "@/hooks/useRoadmap";
import { getLayoutedElements } from "@/lib/layout";
import { RoadmapNode } from "@/components/roadmap/RoadmapNode";
import {
  NodeViewerSidebar,
  NodeDraft,
} from "@/components/roadmap/NodeViewerSidebar";

const nodeTypes = {
  roadmapNode: RoadmapNode,
};

export default function PublicRoadmapDetailPage() {
  const params = useParams();
  const idStr = params.id as string;
  const roadmapId = parseInt(idStr, 10);

  // Load existing roadmap
  const { data: roadmap, isLoading } = useGetPublicRoadmap(roadmapId);

  // Canvas State
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [edges, setEdges] = useState<{ source: string; target: string }[]>([]);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Initialize state from existing roadmap
  useEffect(() => {
    if (roadmap) {
      const loadedNodes =
        roadmap.nodes?.map((n: any) => ({
          ...n,
          id: String(n.id),
        })) || [];

      setNodes(loadedNodes);

      const loadedEdges = [];
      for (let i = 0; i < loadedNodes.length - 1; i++) {
        loadedEdges.push({
          source: loadedNodes[i].id,
          target: loadedNodes[i + 1].id,
        });
      }
      setEdges(loadedEdges);
    }
  }, [roadmap]);

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
      isReadOnly: true,
    }));
    return getLayoutedElements(layoutNodes, edges);
  }, [nodes, edges]);

  const handleNodeClick = (_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
    setIsSidebarOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-xl font-bold mb-2">Roadmap not found</h3>
        <p className="text-muted-foreground mb-6">
          This learning path might have been deleted or is private.
        </p>
        <Link
          href="/public-roadmaps"
          className="px-6 py-2.5 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-400 transition-colors"
        >
          Back to Public Roadmaps
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col text-foreground selection:bg-sky-500/30">
      <header className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border relative z-20">
        <div className="px-6 py-4 flex items-center justify-between max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-6">
            <Link
              href="/public-roadmaps"
              className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-sky-500/20 blur-lg rounded-full" />
                <Image
                  src="/favicon.svg"
                  alt="SkillFlow Logo"
                  width={32}
                  height={32}
                  className="relative z-10"
                />
              </div>
            </Link>

            <div className="flex items-center gap-2 text-muted-foreground/50">
              <ChevronRight className="w-4 h-4" />
              <Link
                href="/public-roadmaps"
                className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Public Roadmaps
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                {roadmap.title || "Untitled Roadmap"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/public-roadmaps"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to List
            </Link>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {roadmap.description && (
        <div className="px-6 py-4 border-b border-border bg-background/50">
          <p className="text-sm text-muted-foreground">{roadmap.description}</p>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        <NodeViewerSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          initialData={selectedNodeData}
        />

        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <h3 className="text-lg font-medium text-foreground">
              This roadmap is empty
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              The author hasn't added any milestones to this learning path yet.
            </p>
          </div>
        ) : (
          <div className="w-full h-full animate-in fade-in zoom-in-95 duration-1000 ease-out">
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
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#3f3f46"
              />
              <Controls className="bg-accent border-border text-muted-foreground [&>button]:bg-accent [&>button]:border-border [&>button]:text-muted-foreground [&>button:hover]:bg-accent/80 rounded-xl" />
            </ReactFlow>
          </div>
        )}
      </main>
    </div>
  );
}
