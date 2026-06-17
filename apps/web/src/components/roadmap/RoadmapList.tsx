"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  MoreVertical,
  Trash2,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface Roadmap {
  _id: string;
  _creationTime: number;
  title: string;
  topic: string;
  status: "questioning" | "generating" | "ready";
  nodes: { data: { completed: boolean } }[];
}

interface RoadmapListProps {
  roadmaps: Roadmap[];
  onDelete?: (id: string) => void;
}

export function RoadmapList({ roadmaps, onDelete }: RoadmapListProps) {
  const getStatusBadge = (status: Roadmap["status"]) => {
    switch (status) {
      case "questioning":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/5 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
          >
            In Setup
          </Badge>
        );
      case "generating":
        return (
          <Badge
            variant="outline"
            className="bg-sky-500/5 text-sky-500 border-sky-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse"
          >
            AI Working
          </Badge>
        );
      case "ready":
        return (
          <Badge
            variant="outline"
            className="bg-teal-500/5 text-teal-500 border-teal-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
          >
            Ready
          </Badge>
        );
    }
  };

  const getProgress = (nodes: Roadmap["nodes"]) => {
    if (nodes.length === 0) return 0;
    const completed = nodes.filter((n) => n.data.completed).length;
    return Math.round((completed / nodes.length) * 100);
  };

  if (roadmaps.length === 0) {
    return (
      <div className="relative group overflow-hidden rounded-2xl border border-border bg-card/20 backdrop-blur-sm p-12 text-center">
        <div className="absolute inset-0 bg-linear-to-b from-border/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <Zap className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-3">
            No Roadmaps Found
          </h3>
          <p className="text-muted-foreground max-w-sm mb-10 leading-relaxed font-medium">
            Your learning journey is a blank canvas. Generate your first AI
            roadmap to start mastering new skills today.
          </p>
          <Link href="/roadmap/new">
            <button className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20">
              Start Your First Journey
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {roadmaps.map((roadmap) => {
        const progress = getProgress(roadmap.nodes);
        const completedCount = roadmap.nodes.filter(
          (n) => n.data.completed,
        ).length;

        return (
          <div
            key={roadmap._id}
            className="group relative flex flex-col bg-card/40 border border-border rounded-xl overflow-hidden hover:border-muted-foreground/30 hover:bg-card/60 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-2xl hover:shadow-black/50"
          >
            {/* Gradient Header Detail */}
            <div
              className={`h-1 w-full bg-linear-to-r ${
                roadmap.status === "ready"
                  ? "from-teal-500 to-sky-500"
                  : "from-amber-500 to-orange-500"
              } opacity-40 group-hover:opacity-100 transition-opacity`}
            />

            <div className="p-7 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                    {roadmap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium truncate">
                    {roadmap.topic}
                  </p>
                </div>
                {getStatusBadge(roadmap.status)}
              </div>

              {roadmap.status === "ready" && (
                <div className="mt-auto space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold tracking-widest uppercase text-muted-foreground">
                      <span>Progress</span>
                      <span
                        className={
                          progress === 100 ? "text-teal-400" : "text-foreground"
                        }
                      >
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                          progress === 100 ? "bg-teal-500" : "bg-sky-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute top-0 right-0 bottom-0 w-8 bg-linear-to-r from-transparent to-white/20" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">
                      <CheckCircle2
                        className={`w-3 h-3 ${progress === 100 ? "text-teal-500" : ""}`}
                      />
                      <span>
                        {completedCount} / {roadmap.nodes.length} Steps Mastered
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/roadmap/${roadmap._id}`} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 py-3 bg-muted hover:bg-accent text-foreground rounded-xl font-bold text-sm transition-all">
                        <span>Open Canvas</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(roadmap._id)}
                        className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {roadmap.status !== "ready" && (
                <div className="mt-auto pt-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Created{" "}
                      {new Date(roadmap._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                  <Link href={`/roadmap/${roadmap._id}`} className="w-full">
                    <button className="w-full py-3.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 rounded-xl font-bold text-sm transition-all">
                      Continue Setup
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
