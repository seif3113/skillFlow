"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGetPublicRoadmaps } from "@/hooks/useRoadmap";
import { RoadmapPreview } from "@/components/roadmap/RoadmapPreview";
import { useState } from "react";

export default function PublicRoadmapsPage() {
  const { data: roadmaps, isLoading } = useGetPublicRoadmaps();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-sky-500/30 overflow-x-hidden">
      {/* Subtle Depth Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[140px] dark:opacity-[0.08] opacity-[0.03]"
          style={{ background: "oklch(0.6 0.18 200)" }}
        />
        <div
          className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[140px] dark:opacity-[0.05] opacity-[0.02]"
          style={{ background: "oklch(0.6 0.18 160)" }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 px-6 py-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full group-hover:bg-sky-500/40 transition-colors" />
            <Image
              src="/favicon.svg"
              alt="SkillFlow Logo"
              width={40}
              height={40}
              className="relative z-10"
            />
          </div>
          <span className="text-foreground font-bold text-2xl tracking-tight">
            SkillFlow
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground uppercase tracking-widest">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <div className="flex items-center gap-4 border-l border-border pl-8">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Public Roadmaps
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Explore learning paths shared by the community.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : roadmaps && roadmaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap: any) => (
              <div
                key={roadmap.id}
                className="bg-card/30 border border-border rounded-2xl p-6 hover:bg-card/50 transition-all hover:shadow-xl hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{roadmap.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {roadmap.userName}
                    </p>
                  </div>
                </div>
                {roadmap.description && (
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {roadmap.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {roadmap.nodes?.length || 0} nodes
                  </span>
                  <Link
                    href={`/public-roadmaps/${roadmap.id}`}
                    className="text-sky-500 font-bold text-sm hover:text-sky-400 transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              No public roadmaps yet. Be the first to publish!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
