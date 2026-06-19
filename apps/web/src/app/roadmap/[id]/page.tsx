"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node as FlowNode,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  LayoutDashboard,
  Share2,
  MoreHorizontal,
  CheckCircle2,
  Plus,
  Settings,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  useGetRoadmap,
  useCreateRoadmap,
  useUpdateRoadmap,
  useDeleteRoadmap,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
  usePublishRoadmap,
  useUpdateRoadmapAi,
} from "@/hooks/useRoadmap";
import { useRoadmapStream } from "@/hooks/useRoadmapStream";
import { getLayoutedElements } from "@/lib/layout";
import { RoadmapNode } from "@/components/roadmap/RoadmapNode";
import { InitRoadmapDialog } from "@/components/roadmap/InitRoadmapDialog";
import {
  NodeEditorSidebar,
  NodeDraft,
} from "@/components/roadmap/NodeEditorSidebar";
import {
  NodeChatPanel,
  AiEditBottomPanel,
  PreviewBanner,
} from "@/components/roadmap";
import { ConfirmDialog } from "@/components/roadmap/ConfirmDialog";
import { toast } from "sonner";

const nodeTypes = {
  roadmapNode: RoadmapNode,
};

export default function RoadmapPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const idStr = params.id as string;
  const roadmapId = parseInt(idStr, 10);
  const topic = searchParams.get("topic");
  const answersJson = searchParams.get("answers");

  // Load existing roadmap
  const {
    data: existingRoadmap,
    isLoading: isLoadingRoadmap,
    refetch,
  } = useGetRoadmap(roadmapId);

  const {
    nodes: streamedNodes,
    status: streamStatus,
    error: streamError,
    startGeneration,
  } = useRoadmapStream();

  const customizationAnswers = useMemo(() => {
    if (!answersJson) return undefined;
    try {
      return JSON.parse(answersJson) as string[];
    } catch {
      return undefined;
    }
  }, [answersJson]);

  useEffect(() => {
    if (roadmapId && topic && streamStatus === "idle") {
      startGeneration(roadmapId, topic, customizationAnswers);
    }
  }, [roadmapId, topic, streamStatus, startGeneration, customizationAnswers]);

  useEffect(() => {
    if (streamStatus === "done" || streamStatus === "error") {
      refetch();
      if (streamStatus === "done") {
        router.replace(`/roadmap/${roadmapId}`);
      }
    }
  }, [streamStatus, refetch, router, roadmapId]);

  // Roadmap Metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isDeleteNodeConfirmOpen, setIsDeleteNodeConfirmOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  // Canvas State
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [edges, setEdges] = useState<{ source: string; target: string }[]>([]);

  // Editor Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Chatbot Panel State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatNodeTitle, setChatNodeTitle] = useState("");

  // AI Edit States
  const [isAiEditPanelOpen, setIsAiEditPanelOpen] = useState(false);
  const [isAiEditingLoading, setIsAiEditingLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [originalNodes, setOriginalNodes] = useState<NodeDraft[]>([]);
  const [originalEdges, setOriginalEdges] = useState<
    { source: string; target: string }[]
  >([]);
  const [proposedNodes, setProposedNodes] = useState<NodeDraft[]>([]);
  const [proposedEdges, setProposedEdges] = useState<
    { source: string; target: string }[]
  >([]);

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      setChatNodeTitle(customEvent.detail.title);
      setIsChatOpen(true);
      setIsSidebarOpen(false); // Close other sidebars when chat opens
    };
    window.addEventListener("open-ai-chat", handleOpenChat);
    return () => window.removeEventListener("open-ai-chat", handleOpenChat);
  }, []);

  // Mutations
  const { mutateAsync: createRoadmap, isPending: isCreatingRoadmap } =
    useCreateRoadmap();
  const { mutateAsync: updateRoadmap, isPending: isUpdatingRoadmap } =
    useUpdateRoadmap();
  const { mutateAsync: deleteRoadmap, isPending: isDeletingRoadmap } =
    useDeleteRoadmap();
  const { mutateAsync: publishRoadmap, isPending: isPublishing } =
    usePublishRoadmap();

  const { mutateAsync: createNode, isPending: isCreatingNode } =
    useCreateNode();
  const { mutateAsync: updateNode, isPending: isUpdatingNode } =
    useUpdateNode();
  const { mutateAsync: deleteNode } = useDeleteNode();
  const { mutateAsync: updateRoadmapAi } = useUpdateRoadmapAi();
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const isSavingNode = isCreatingNode || isUpdatingNode || isApplyingEdits;

  const handlePublish = async () => {
    if (!roadmapId) return;
    try {
      const response = await publishRoadmap(roadmapId);
      const nextState = response.publishRoadmap.isPublished;
      setIsPublished(nextState);
      toast.success(
        nextState
          ? "Roadmap published successfully!"
          : "Roadmap is now private.",
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to update publication status.");
    }
  };

  // Initialize state from existing roadmap
  useEffect(() => {
    if (existingRoadmap) {
      setTitle(existingRoadmap.title || "");
      setDescription(existingRoadmap.description || "");
      setIsPublished(existingRoadmap.isPublished || false);

      const loadedNodes =
        existingRoadmap.nodes?.map((n: any) => ({
          ...n,
          id: String(n.id),
        })) || [];

      // Sort nodes by numeric ID ascending
      loadedNodes.sort((a: any, b: any) => Number(a.id) - Number(b.id));

      setNodes(loadedNodes);

      const loadedEdges = [];
      for (let i = 0; i < loadedNodes.length - 1; i++) {
        loadedEdges.push({
          source: loadedNodes[i].id,
          target: loadedNodes[i + 1].id,
        });
      }
      setEdges(loadedEdges);

      if (
        !existingRoadmap.title ||
        existingRoadmap.title === "Untitled Roadmap"
      ) {
        setIsInitDialogOpen(true);
      }
    }
  }, [existingRoadmap]);

  const selectedNodeData = useMemo(() => {
    const activeNodes = isPreviewMode ? proposedNodes : nodes;
    if (!selectedNodeId) return null;
    return activeNodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, proposedNodes, isPreviewMode, selectedNodeId]);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    let activeNodes = isPreviewMode ? proposedNodes : nodes;
    let activeEdges = isPreviewMode ? proposedEdges : edges;

    if (streamStatus !== "idle") {
      const mergedNodes = [...activeNodes];

      streamedNodes.forEach((sn) => {
        if (
          !mergedNodes.find(
            (n) =>
              String(n.id) === String(sn.id) ||
              n.title.toLowerCase() === sn.title.toLowerCase(),
          )
        ) {
          mergedNodes.push({
            id: String(sn.id),
            title: sn.title,
            description: sn.description || "",
            tags: sn.tags,
            resources: sn.resources || [],
            isCompleted: sn.isCompleted,
          });
        }
      });

      // Add shimmer skeleton nodes at the end to indicate AI is working
      if (streamStatus === "connecting" || streamStatus === "streaming") {
        const skeletonCount = 1;
        for (let i = 0; i < skeletonCount; i++) {
          mergedNodes.push({
            id: `skeleton-${i}`,
            title: "Generating...",
            description: "",
            tags: [],
            resources: [],
            isCompleted: false,
            isSkeleton: true,
          } as any);
        }
      }

      activeNodes = mergedNodes;

      const newEdges = [];
      for (let i = 0; i < activeNodes.length - 1; i++) {
        if (activeNodes[i].id && activeNodes[i + 1].id) {
          newEdges.push({
            source: activeNodes[i].id!,
            target: activeNodes[i + 1].id!,
          });
        }
      }
      activeEdges = newEdges;
    }

    const layoutNodes = activeNodes.map((n) => ({
      id: n.id!,
      label: n.title,
      description: n.description,
      resources: n.resources,
      completed: n.isCompleted,
      isReadOnly: streamStatus !== "idle",
      diffState: (n as any).diffState,
      isSkeleton: (n as any).isSkeleton,
    }));
    return getLayoutedElements(layoutNodes, activeEdges);
  }, [
    nodes,
    proposedNodes,
    edges,
    proposedEdges,
    isPreviewMode,
    streamedNodes,
    streamStatus,
  ]);

  // Calculate progress (mocked since backend doesn't store 'completed' yet)
  const completedCount = flowNodes.filter((n) => n.data.completed).length;
  const totalCount = flowNodes.length;
  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleInitSubmit = async (data: {
    title: string;
    description: string;
  }) => {
    setTitle(data.title);
    setDescription(data.description);
    try {
      await updateRoadmap({
        id: roadmapId,
        title: data.title,
        description: data.description,
      });
      toast.success("Roadmap updated successfully!");
    } catch (e) {
      console.error("Failed to update roadmap info", e);
      toast.error("Failed to update roadmap info.");
    }
  };

  const handleAiEditSubmit = async (prompt: string) => {
    setIsAiEditingLoading(true);
    try {
      setOriginalNodes(nodes);
      setOriginalEdges(edges);

      // Call the NestJS graphql updateRoadmapAi mutation
      const resultNodes = await updateRoadmapAi({
        id: roadmapId,
        message: prompt,
      });

      // Map backend response nodes to NodeDraft format
      const incomingNodes: (NodeDraft & {
        id?: string;
        diffState?: "added" | "modified" | "deleted";
      })[] = resultNodes.map((n: any) => {
        const existsInOriginal = nodes.some(
          (origNode) => String(origNode.id) === String(n.id),
        );
        return {
          id: existsInOriginal && n.id ? String(n.id) : undefined,
          title: n.title,
          description: n.description || "",
          tags: n.tags || [],
          resources: n.resources || [],
          isCompleted: n.isCompleted || false,
        };
      });

      const updatedNodes: (NodeDraft & {
        id?: string;
        diffState?: "added" | "modified" | "deleted";
      })[] = [];

      // 1. Find added or modified nodes
      incomingNodes.forEach((incNode) => {
        const existingMatch = incNode.id
          ? nodes.find((origNode) => String(origNode.id) === String(incNode.id))
          : nodes.find(
              (origNode) =>
                origNode.title.toLowerCase().trim() ===
                incNode.title.toLowerCase().trim(),
            );

        if (!existingMatch) {
          updatedNodes.push({
            ...incNode,
            id: incNode.id
              ? String(incNode.id)
              : "temp-" + Date.now() + Math.random(),
            diffState: "added",
          });
        } else {
          // Normalize descriptions
          const desc1 = (existingMatch.description || "").trim();
          const desc2 = (incNode.description || "").trim();
          const isDescChanged = desc1 !== desc2;

          // Normalize tags
          const tags1 = (existingMatch.tags || [])
            .map((t) => t.toLowerCase().trim())
            .sort();
          const tags2 = (incNode.tags || [])
            .map((t) => t.toLowerCase().trim())
            .sort();
          const isTagsChanged = JSON.stringify(tags1) !== JSON.stringify(tags2);

          // Normalize resources (compare key fields: title, url)
          const normalizeRes = (r: any) => ({
            title: (r.title || "").trim().toLowerCase(),
            url: (r.url || "").trim().toLowerCase(),
          });
          const res1 = (existingMatch.resources || [])
            .map(normalizeRes)
            .sort((a, b) => a.url.localeCompare(b.url));
          const res2 = (incNode.resources || [])
            .map(normalizeRes)
            .sort((a, b) => a.url.localeCompare(b.url));
          const isResourcesChanged =
            JSON.stringify(res1) !== JSON.stringify(res2);

          const isModified =
            isDescChanged || isTagsChanged || isResourcesChanged;

          updatedNodes.push({
            ...incNode,
            id: String(existingMatch.id),
            diffState: isModified ? "modified" : undefined,
          });
        }
      });

      // 2. Find deleted nodes (nodes in original that are not in incomingNodes)
      nodes.forEach((origNode) => {
        const stillExists = incomingNodes.some(
          (incNode) =>
            incNode.title.toLowerCase().trim() ===
            origNode.title.toLowerCase().trim(),
        );

        if (!stillExists) {
          updatedNodes.push({
            ...origNode,
            diffState: "deleted",
          });
        }
      });

      // Rebuild preview edges linearly for the preview representation
      const updatedEdges = [];
      const nonDeletedNodes = updatedNodes.filter(
        (n) => n.diffState !== "deleted",
      );
      for (let i = 0; i < nonDeletedNodes.length - 1; i++) {
        updatedEdges.push({
          source: nonDeletedNodes[i].id!,
          target: nonDeletedNodes[i + 1].id!,
        });
      }

      setProposedNodes(updatedNodes);
      setProposedEdges(updatedEdges);
      setIsAiEditingLoading(false);
      setIsAiEditPanelOpen(false);
      setIsPreviewMode(true);
      toast.success("AI edits proposed! Review the preview on canvas.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI edits.");
      setIsAiEditingLoading(false);
    }
  };

  const handleApplyAiEdits = async () => {
    setIsApplyingEdits(true);
    try {
      const deletedNodes = proposedNodes.filter(
        (n) => (n as any).diffState === "deleted",
      );
      for (const node of deletedNodes) {
        if (node.id && !node.id.startsWith("temp-")) {
          await deleteNode(parseInt(node.id, 10));
        }
      }

      const modifiedNodes = proposedNodes.filter(
        (n) => (n as any).diffState === "modified",
      );
      for (const node of modifiedNodes) {
        if (node.id) {
          await updateNode({
            id: parseInt(node.id, 10),
            title: node.title,
            description: node.description,
            tags: node.tags,
            resources: node.resources,
            isCompleted: node.isCompleted,
          });
        }
      }

      const addedNodes = proposedNodes.filter(
        (n) => (n as any).diffState === "added",
      );
      for (const node of addedNodes) {
        await createNode({
          roadmapId,
          title: node.title,
          description: node.description,
          tags: node.tags,
          resources: node.resources,
          isCompleted: node.isCompleted,
        });
      }

      toast.success("AI changes applied successfully!");
      refetch();
      setIsPreviewMode(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply AI changes.");
    } finally {
      setIsApplyingEdits(false);
    }
  };

  const handleDiscardAiEdits = () => {
    setIsPreviewMode(false);
    setProposedNodes([]);
    setProposedEdges([]);
    toast.info("AI proposed changes discarded.");
  };

  const openAddNode = () => {
    setSelectedNodeId(null);
    setIsSidebarOpen(true);
  };

  const handleNodeClick = (_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
    if (isChatOpen) {
      setChatNodeTitle((node.data as any)?.label || node.id);
    } else {
      setIsSidebarOpen(true);
    }
  };

  const handleSaveNode = async (nodeDraft: NodeDraft) => {
    try {
      if (selectedNodeId) {
        await updateNode({
          id: parseInt(selectedNodeId, 10),
          title: nodeDraft.title,
          description: nodeDraft.description,
          tags: nodeDraft.tags,
          resources: nodeDraft.resources,
          isCompleted: nodeDraft.isCompleted,
        });
        setNodes((prev) =>
          prev.map((n) =>
            n.id === selectedNodeId ? { ...nodeDraft, id: selectedNodeId } : n,
          ),
        );
        toast.success("Node updated successfully!");
      } else {
        const response = await createNode({
          roadmapId,
          title: nodeDraft.title,
          description: nodeDraft.description,
          tags: nodeDraft.tags,
          resources: nodeDraft.resources,
          isCompleted: nodeDraft.isCompleted,
        });
        const createdNode = response.createNode;
        const newNodeId = String(createdNode.id);
        const newNode = { ...nodeDraft, id: newNodeId };
        setNodes((prev) => [...prev, newNode]);

        if (nodes.length > 0) {
          const lastNode = nodes[nodes.length - 1];
          setEdges((prev) => [
            ...prev,
            { source: lastNode.id!, target: newNodeId },
          ]);
        }
        toast.success("Node created successfully!");
      }
    } catch (e) {
      console.error("Failed to save node", e);
      toast.error("Failed to save node.");
    }
    setIsSidebarOpen(false);
    setSelectedNodeId(null);
  };

  const handleDeleteNodeClick = () => {
    setIsDeleteNodeConfirmOpen(true);
  };

  const confirmDeleteNode = async () => {
    if (!selectedNodeId) return;

    try {
      await deleteNode(parseInt(selectedNodeId, 10));
      setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));

      setEdges((prev) => {
        const incoming = prev.find((e) => e.target === selectedNodeId);
        const outgoing = prev.find((e) => e.source === selectedNodeId);
        const remaining = prev.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
        );

        if (incoming && outgoing) {
          remaining.push({ source: incoming.source, target: outgoing.target });
        }
        return remaining;
      });
      toast.success("Node deleted successfully!");
    } catch (e) {
      console.error("Failed to delete node", e);
      toast.error("Failed to delete node.");
    }

    setIsSidebarOpen(false);
    setSelectedNodeId(null);
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmapId) return;

    try {
      await deleteRoadmap(roadmapId);
      toast.success("Roadmap deleted successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete roadmap:", err);
      toast.error("Failed to delete roadmap.");
    }
  };

  // No longer using manual save roadmap handler

  if (isLoadingRoadmap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSaving = isCreatingRoadmap || isUpdatingRoadmap;

  return (
    <div className="h-screen bg-background flex flex-col text-foreground selection:bg-sky-500/30">
      <header className="shrink-0 bg-background/80 backdrop-blur-md border-b border-border relative z-20">
        <div className="px-6 py-4 flex items-center justify-between max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
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
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
                {title || "Untitled Roadmap"}
              </span>
              <span className="ml-2 shrink-0">
                {isPublished ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Private
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Mastery Progress</span>
                  <span className="text-sky-400">{progress}%</span>
                </div>
                <div className="mt-1.5 w-48 h-1.5 bg-muted rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-linear-to-r from-sky-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div
                className={`flex flex-col items-center justify-center h-10 w-10 rounded-xl border transition-all ${
                  progress === 100
                    ? "bg-teal-500/20 border-teal-500/40 text-teal-400"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-8">
              <ThemeToggle />
              <button
                onClick={() => setIsPublishConfirmOpen(true)}
                disabled={isPublishing}
                className={`p-2.5 rounded-xl transition-all disabled:opacity-50 hover:bg-accent ${
                  isPublished
                    ? "text-sky-500 hover:text-sky-400"
                    : "text-muted-foreground hover:text-sky-500"
                }`}
                title={isPublished ? "Make Private" : "Publish Roadmap"}
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
        <div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInitDialogOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
            title="Edit Roadmap Info"
          >
            <Settings className="w-5 h-5" />
          </button>

          {roadmapId && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isDeletingRoadmap}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Delete Roadmap"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setIsAiEditPanelOpen(true)}
            disabled={isSavingNode || isPreviewMode}
            className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-accent disabled:opacity-50 text-foreground text-sm font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
            <span>Edit by AI</span>
          </button>

          <button
            onClick={openAddNode}
            disabled={isSavingNode}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-sky-500/20"
          >
            {isSavingNode ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Add Node</span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden relative">
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
          onDelete={handleDeleteNodeClick}
          isSaving={isSavingNode}
        />

        <NodeChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          nodeTitle={chatNodeTitle}
        />

        <PreviewBanner
          isOpen={isPreviewMode}
          onApply={handleApplyAiEdits}
          onDiscard={handleDiscardAiEdits}
          isSaving={isSavingNode}
        />

        <AiEditBottomPanel
          isOpen={isAiEditPanelOpen}
          onClose={() => setIsAiEditPanelOpen(false)}
          onSubmit={handleAiEditSubmit}
          isLoading={isAiEditingLoading}
        />

        <ConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          onConfirm={handleDeleteRoadmap}
          title="Delete Roadmap"
          description="Are you sure you want to delete this roadmap? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        <ConfirmDialog
          open={isPublishConfirmOpen}
          onOpenChange={setIsPublishConfirmOpen}
          onConfirm={handlePublish}
          title={isPublished ? "Make Roadmap Private" : "Publish Roadmap"}
          description={
            isPublished
              ? "Are you sure you want to make this roadmap private again? It will be removed from the public directory."
              : "Are you sure you want to publish this roadmap to the public directory?"
          }
          confirmText={isPublished ? "Make Private" : "Publish"}
        />

        <ConfirmDialog
          open={isDeleteNodeConfirmOpen}
          onOpenChange={setIsDeleteNodeConfirmOpen}
          onConfirm={confirmDeleteNode}
          title="Delete Node"
          description="Are you sure you want to delete this node? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        {flowNodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border shadow-xl">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              Your roadmap is empty
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              Start adding nodes to build your learning path step by step.
            </p>
            <button
              onClick={openAddNode}
              className="mt-6 px-6 py-2.5 bg-sky-500 text-white font-medium rounded-xl pointer-events-auto hover:bg-sky-400 transition-colors"
            >
              Add First Node
            </button>
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
              minZoom={0.1}
              maxZoom={2}
            >
              <AutoFitView streamStatus={streamStatus} />
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

function AutoFitView({ streamStatus }: { streamStatus: string }) {
  const { setViewport, getNodes } = useReactFlow();

  useEffect(() => {
    if (streamStatus === 'connecting') {
      const timeoutId = setTimeout(() => {
        const nodes = getNodes();
        if (nodes.length > 0) {
          const firstNode = nodes[0];
          const targetZoom = 0.45; // Fixed zoomed-out scale
          
          // Node width is approximately 260px, so center X is position.x + 130
          const nodeCenterX = firstNode.position.x + 130;
          
          // Center horizontally in the window, and place the first node 120px from the top
          const viewportX = (window.innerWidth / 2) - (nodeCenterX * targetZoom);
          const viewportY = 20 - (firstNode.position.y * targetZoom);

          setViewport({ x: viewportX, y: viewportY, zoom: targetZoom }, { duration: 800 });
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [streamStatus, getNodes, setViewport]);

  return null;
}
