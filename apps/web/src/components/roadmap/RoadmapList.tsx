"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Clock,
  Trash2,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface Roadmap {
  id: number;
  title: string;
  description?: string;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: any[];
}

interface RoadmapListProps {
  roadmaps: Roadmap[];
  onDelete?: (id: number) => void;
  onEdit?: (roadmap: Roadmap) => void;
}

export function RoadmapList({ roadmaps, onDelete, onEdit }: RoadmapListProps) {
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
            Your learning journey is a blank canvas. Start your first manual or AI
            roadmap to start mastering new skills today.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/roadmap/manual">
              <button className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20">
                Manual Setup
              </button>
            </Link>
            <Link href="/roadmap/new">
              <button className="px-8 py-3.5 bg-zinc-800 text-zinc-100 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 border border-zinc-700">
                AI Generated
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {roadmaps.map((roadmap) => {
        return (
          <div
            key={roadmap.id}
            className="group relative flex flex-col bg-card/40 border border-border rounded-xl overflow-hidden hover:border-muted-foreground/30 hover:bg-card/60 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-2xl hover:shadow-black/50"
          >
            {/* Gradient Header Detail */}
            <div className="h-1 w-full bg-linear-to-r from-teal-500 to-sky-500 opacity-40 group-hover:opacity-100 transition-opacity" />

            <div className="p-7 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                    {roadmap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium truncate">
                    {roadmap.description || "No description"}
                  </p>
                </div>
                {roadmap.isPublished ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  >
                    Published
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-zinc-800 text-zinc-400 border-zinc-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  >
                    Private
                  </Badge>
                )}
              </div>

              <div className="mt-auto space-y-4">
                {(() => {
                  const total = roadmap.nodes?.length || 0;
                  const completed = roadmap.nodes?.filter((n: any) => n.isCompleted).length || 0;
                  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                  if (total === 0) return null;

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{percent}% ({completed}/{total})</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-teal-500 to-sky-500 transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Created{" "}
                    {new Date(roadmap.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/roadmap/${roadmap.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-muted hover:bg-accent text-foreground rounded-xl font-bold text-sm transition-all">
                      <span>Open Canvas</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </Link>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(roadmap)}
                      className="p-3 bg-muted hover:bg-accent text-foreground rounded-xl transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(roadmap.id)}
                      className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
