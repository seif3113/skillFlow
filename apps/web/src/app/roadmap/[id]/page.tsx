"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { RoadmapEditor } from "@/components/roadmap/RoadmapEditor";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Node } from "@xyflow/react";
import type { RoadmapNodeData } from "@/components/roadmap/RoadmapNode";
import Image from "next/image";

export default function RoadmapPage() {
  // const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const params = useParams();
  // const roadmapId = params.id as Id<"roadmaps">;

  // const roadmap = useQuery(api.roadmaps.get, { id: roadmapId });
  // const updateNode = useMutation(api.roadmaps.updateNode);
  // const updateLayout = useMutation(api.roadmaps.updateLayout);

  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     router.push("/signin");
  //   }
  // }, [isAuthenticated, authLoading, router]);

  // const handleNodeUpdate = useCallback(
  //   async (nodeId: string, data: Partial<RoadmapNodeData>) => {
  //     await updateNode({ id: roadmapId, nodeId, data });
  //   },
  //   [roadmapId, updateNode]
  // );

  // const handleLayoutChange = useCallback(
  //   async (nodes: Node[]) => {
  //     await updateLayout({
  //       id: roadmapId,
  //       nodes: nodes.map((n) => ({
  //         id: n.id,
  //         type: n.type || "roadmapNode",
  //         position: n.position,
  //         data: n.data as {
  //           label: string;
  //           description: string;
  //           resources: { title: string; url: string }[];
  //           completed: boolean;
  //         },
  //       })),
  //     });
  //   },
  //   [roadmapId, updateLayout]
  // );

  // if (authLoading || roadmap === undefined) {
  //   return (
  //     <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
  //       <div className="flex items-center gap-3">
  //         <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
  //         <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
  //         <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
  //       </div>
  //     </div>
  //   );
  // }

  // if (!isAuthenticated) {
  //   return null;
  // }

  // if (roadmap === null) {
  //   return (
  //     <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
  //       <h1 className="text-2xl font-bold text-zinc-100 mb-4">Roadmap not found</h1>
  //       <Link href="/dashboard" className="text-sky-400 hover:text-sky-300">
  //         ← Back to Dashboard
  //       </Link>
  //     </div>
  //   );
  // }

  // // Convert stored nodes/edges to React Flow format
  // const nodes: Node[] = roadmap.nodes.map((n) => ({
  //   id: n.id,
  //   type: n.type,
  //   position: n.position,
  //   data: n.data,
  // }));

  // const edges = roadmap.edges.map((e) => ({
  //   id: e.id,
  //   source: e.source,
  //   target: e.target,
  //   type: "smoothstep" as const,
  // }));

  // const completedCount = roadmap.nodes.filter((n) => n.data.completed).length;
  // const progress = roadmap.nodes.length > 0
  //   ? Math.round((completedCount / roadmap.nodes.length) * 100)
  //   : 0;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <header className="shrink-0 bg-zinc-950 border-b border-zinc-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="inline-flex items-center justify-center rounded-2xl">
                <Image
                  src="/favicon.svg"
                  alt="SkillFlow Logo"
                  width={50}
                  height={50}
                />
              </div>
            </Link>
            <div className="h-6 w-px bg-zinc-700" />
            <div>
              <h1 className="font-bold text-lg text-zinc-100">title</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-xs">
                  100% Complete
                </Badge>
                <span className="text-xs text-zinc-500">
                  10 of 10 steps done
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-sm px-4 py-2 rounded-lg hover:bg-zinc-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {/* {roadmap.nodes.length > 0 ? ( */}
        <RoadmapEditor
          initialNodes={[]}
          initialEdges={[]}
          onNodesChange={() => {}}
          onNodeUpdate={() => Promise.resolve()}
        />
        {/* ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-zinc-400">This roadmap is still being generated...</p>
          </div>
        )} */}
      </main>
    </div>
  );
}
