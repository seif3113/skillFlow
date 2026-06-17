"use client";

import { RoadmapList } from "@/components/roadmap";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  return <Dashboard />;
}

function Dashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-[0.05] dark:opacity-[0.1]"
          style={{ background: "oklch(0.6 0.18 200)" }}
        />
      </div>

      <header className="relative z-10 border-b border-border bg-background/50 backdrop-blur-md top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group transition-transform hover:scale-[1.02]"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-sky-500/20 blur-lg rounded-full group-hover:bg-sky-500/40 transition-colors" />
              <Image
                src="/favicon.svg"
                alt="SkillFlow Logo"
                width={38}
                height={38}
                className="relative z-10"
              />
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">
              SkillFlow
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent gap-2 font-medium"
              onClick={() => router.push("/signin")}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Welcome / Actions Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Your Roadmaps
            </h1>
            <p className="text-muted-foreground font-medium">
              Manage and track your learning progress across all topics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search roadmaps..."
                className="bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring transition-colors w-64"
              />
            </div>

            <Link href="/roadmap/new">
              <button className="group relative flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] shadow-2xl shadow-foreground/5 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                <Plus className="w-5 h-5" />
                <span>Create New</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Roadmap List */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <RoadmapList roadmaps={[]} onDelete={() => {}} />
        </div>
      </main>
    </div>
  );
}
