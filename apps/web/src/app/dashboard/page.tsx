"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { RoadmapList } from "@/components/roadmap";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Search, Sparkles, PenTool } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRoadmapsByUser, useDeleteRoadmap, useUpdateRoadmap } from "@/hooks/useRoadmap";
import { ConfirmDialog } from "@/components/roadmap/ConfirmDialog";
import { InitRoadmapDialog } from "@/components/roadmap/InitRoadmapDialog";
import { toast } from "sonner";

export default function DashboardPage() {
  return <Dashboard />;
}

function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [roadmapToDelete, setRoadmapToDelete] = useState<number | null>(null);
  const [roadmapToEdit, setRoadmapToEdit] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: roadmaps, isLoading: isLoadingRoadmaps } = useRoadmapsByUser(
    session?.user?.id ? parseInt(session.user.id, 10) : undefined
  );
  const { mutate: deleteRoadmap } = useDeleteRoadmap();
  const { mutateAsync: updateRoadmap } = useUpdateRoadmap();

  const handleDelete = (id: number) => {
    setRoadmapToDelete(id);
  };

  const confirmDelete = () => {
    if (roadmapToDelete) {
      deleteRoadmap(roadmapToDelete, {
        onSuccess: () => {
          toast.success("Roadmap deleted successfully!");
        },
        onError: (err) => {
          console.error("Failed to delete roadmap", err);
          toast.error("Failed to delete roadmap.");
        }
      });
      setRoadmapToDelete(null);
    }
  };

  const handleEditSubmit = async (data: { title: string; description: string }) => {
    if (!roadmapToEdit) return;
    try {
      await updateRoadmap({
        id: roadmapToEdit.id,
        title: data.title,
        description: data.description,
      });
      setRoadmapToEdit(null);
      toast.success("Roadmap updated successfully!");
    } catch (error) {
      console.error("Failed to update roadmap", error);
      toast.error("Failed to update roadmap.");
    }
  };

  const filteredRoadmaps = useMemo(() => {
    if (!roadmaps) return [];
    if (!searchQuery.trim()) return roadmaps;
    const cleanQuery = searchQuery.toLowerCase().trim();
    return roadmaps.filter(
      (r: any) =>
        r.title.toLowerCase().includes(cleanQuery) ||
        (r.description && r.description.toLowerCase().includes(cleanQuery))
    );
  }, [roadmaps, searchQuery]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/signin");
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              onClick={handleSignOut}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring transition-colors w-64"
              />
            </div>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="group relative flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] shadow-2xl shadow-foreground/5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-linear-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                <Plus className="w-5 h-5" />
                <span>Create New</span>
              </button>

              {isCreateMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in slide-in-from-top-2 z-50">
                  <Link 
                    href="/roadmap/new"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
                    onClick={() => setIsCreateMenuOpen(false)}
                  >
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">AI Generated</span>
                      <span className="text-xs text-muted-foreground">Answer questions to generate</span>
                    </div>
                  </Link>
                  <Link 
                    href="/roadmap/manual"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
                    onClick={() => setIsCreateMenuOpen(false)}
                  >
                    <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500 group-hover:bg-sky-500/20">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Manual Setup</span>
                      <span className="text-xs text-muted-foreground">Build node by node</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roadmap List */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {isLoadingRoadmaps ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <RoadmapList
              roadmaps={filteredRoadmaps}
              onDelete={handleDelete}
              onEdit={setRoadmapToEdit}
            />
          )}
        </div>

        <ConfirmDialog
          open={roadmapToDelete !== null}
          onOpenChange={(open) => !open && setRoadmapToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Roadmap"
          description="Are you sure you want to delete this roadmap? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        {roadmapToEdit && (
          <InitRoadmapDialog
            open={roadmapToEdit !== null}
            onOpenChange={(open) => !open && setRoadmapToEdit(null)}
            onSubmit={handleEditSubmit}
            initialData={{
              title: roadmapToEdit.title,
              description: roadmapToEdit.description || "",
            }}
          />
        )}
      </main>
    </div>
  );
}
