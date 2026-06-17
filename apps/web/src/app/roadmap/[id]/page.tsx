"use client";

import { useRouter, useParams } from "next/navigation";
import { RoadmapEditor } from "@/components/roadmap/RoadmapEditor";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  LayoutDashboard,
  Share2,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { ThemeToggle } from "@/components/theme-toggle";

const mockNodes: Node[] = [
  {
    id: "1",
    type: "roadmapNode",
    position: { x: 400, y: 0 },
    data: {
      label: "1. Machine Learning Basics",
      description:
        "Understand the core concepts of ML: Supervised, Unsupervised, and Reinforcement learning.",
      resources: [
        { title: "Intro to ML (YouTube)", url: "#" },
        { title: "Linear Algebra for ML", url: "#" },
      ],
      completed: true,
    },
  },
  {
    id: "2",
    type: "roadmapNode",
    position: { x: 200, y: 200 },
    data: {
      label: "2. Supervised Learning",
      description: "Deep dive into Regression and Classification algorithms.",
      resources: [
        { title: "Andrew Ng - Regression", url: "#" },
        { title: "Scikit-learn Docs", url: "#" },
      ],
      completed: true,
    },
  },
  {
    id: "3",
    type: "roadmapNode",
    position: { x: 600, y: 200 },
    data: {
      label: "3. Unsupervised Learning",
      description: "Clustering and Dimensionality Reduction techniques.",
      resources: [
        { title: "K-Means Explained", url: "#" },
        { title: "PCA Implementation", url: "#" },
      ],
      completed: false,
    },
  },
  {
    id: "4",
    type: "roadmapNode",
    position: { x: 400, y: 400 },
    data: {
      label: "4. Neural Networks",
      description:
        "Building blocks of Deep Learning: Perceptrons, Backpropagation, and Activation Functions.",
      resources: [
        { title: "3Blue1Brown - Neural Nets", url: "#" },
        { title: "PyTorch Basics", url: "#" },
      ],
      completed: false,
    },
  },
];

const mockEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep", animated: true },
  { id: "e1-3", source: "1", target: "3", type: "smoothstep", animated: true },
  { id: "e2-4", source: "2", target: "4", type: "smoothstep" },
  { id: "e3-4", source: "3", target: "4", type: "smoothstep" },
];

export default function RoadmapPage() {
  const router = useRouter();
  const params = useParams();

  const completedCount = mockNodes.filter((n) => n.data.completed).length;
  const totalCount = mockNodes.length;
  const progress = Math.round((completedCount / totalCount) * 100);

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
              <span className="text-sm font-bold text-foreground">
                Machine Learning Roadmap
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
              <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <RoadmapEditor
          initialNodes={mockNodes}
          initialEdges={mockEdges}
          onNodesChange={() => {}}
          onNodeUpdate={() => Promise.resolve()}
        />
      </main>
    </div>
  );
}
