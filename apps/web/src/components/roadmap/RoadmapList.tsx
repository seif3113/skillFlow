"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            In Progress
          </Badge>
        );
      case "generating":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Generating
          </Badge>
        );
      case "ready":
        return (
          <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
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
      <Card className="border-zinc-800 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-zinc-200 font-semibold text-lg mb-2">
            No roadmaps yet
          </h3>
          <p className="text-zinc-500 text-center max-w-sm mb-6">
            Create your first learning roadmap to get started on your journey
          </p>
          <Link href="/roadmap/new">
            <Button
              className="text-white shadow-lg shadow-sky-500/20"
              style={{
                background: "linear-gradient(90deg, #0284c7 0%, #0d9488 100%)",
              }}
            >
              Create Your First Roadmap
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {roadmaps.map((roadmap) => {
        const progress = getProgress(roadmap.nodes);
        return (
          <Card
            key={roadmap._id}
            className="border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-zinc-100 text-lg truncate whitespace-normal">
                    {roadmap.title}
                  </CardTitle>
                  <CardDescription className="text-zinc-500 truncate mt-1">
                    {roadmap.topic}
                  </CardDescription>
                </div>
                {getStatusBadge(roadmap.status)}
              </div>
            </CardHeader>
            <CardContent>
              {roadmap.status === "ready" && roadmap.nodes.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Progress</span>
                    <span className="text-zinc-300">{progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        background:
                          "linear-gradient(90deg, #0284c7 0%, #2dd4bf 100%)",
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {roadmap.nodes.filter((n) => n.data.completed).length} of{" "}
                    {roadmap.nodes.length} steps completed
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/roadmap/${roadmap._id}`} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    {roadmap.status === "ready" ? "View" : "Continue"}
                  </Button>
                </Link>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(roadmap._id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                )}
              </div>

              <p className="text-xs text-zinc-600 mt-3">
                Created {new Date(roadmap._creationTime).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
