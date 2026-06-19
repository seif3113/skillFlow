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
import {
  useRoadmapsByUser,
  useDeleteRoadmap,
  useUpdateRoadmap,
  useCreateRoadmap,
  useRoadmapCustomizationQuestions,
} from "@/hooks/useRoadmap";
import { ConfirmDialog } from "@/components/roadmap/ConfirmDialog";
import { InitRoadmapDialog } from "@/components/roadmap/InitRoadmapDialog";
import { toast } from "sonner";

export default function DashboardPage() {
  return <Dashboard />;
}

function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [roadmapToDelete, setRoadmapToDelete] = useState<number | null>(null);
  const [roadmapToEdit, setRoadmapToEdit] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // AI Generator Panel states
  const [aiPrompt, setAiPrompt] = useState("");
  const [customize, setCustomize] = useState(false);
  const [runQuery, setRunQuery] = useState(false);

  // Customization questions panel states
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [customizationQuestions, setCustomizationQuestions] = useState<any[]>(
    [],
  );
  const [answers, setAnswers] = useState<string[]>([]);

  const { data: roadmaps, isLoading: isLoadingRoadmaps } = useRoadmapsByUser(
    session?.user?.id ? parseInt(session.user.id, 10) : undefined,
  );
  const { mutate: deleteRoadmap } = useDeleteRoadmap();
  const { mutateAsync: updateRoadmap } = useUpdateRoadmap();
  const { mutateAsync: createRoadmap } = useCreateRoadmap();

  const { refetch: fetchQuestions, isFetching: isQuestionsLoading } =
    useRoadmapCustomizationQuestions(aiPrompt, runQuery);

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
        },
      });
      setRoadmapToDelete(null);
    }
  };

  const handleCreateNewManual = async () => {
    if (!session?.user?.id) return;
    try {
      const response = await createRoadmap({
        title: "Untitled",
        description: "",
        userId: parseInt(session.user.id, 10),
      });
      toast.success("Manual roadmap created successfully!");
      router.push(`/roadmap/${response.createRoadmap.id}`);
    } catch (error) {
      console.error("Failed to create roadmap", error);
      toast.error("Failed to create roadmap.");
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    if (customize) {
      setRunQuery(true);
      setTimeout(() => {
        fetchQuestions().then((res) => {
          if (res.data && res.data.length > 0) {
            setCustomizationQuestions(res.data);
            setAnswers(new Array(res.data.length).fill(""));
            setIsCustomizationOpen(true);
          } else {
            toast.error("Failed to load customization questions.");
          }
          setRunQuery(false);
        });
      }, 50);
    } else {
      // Direct prompt: call route with topic parameters
      router.push(`/roadmap/new?topic=${encodeURIComponent(aiPrompt.trim())}`);
    }
  };

  const handleCustomizationSubmit = async () => {
    const payload = customizationQuestions.map((q, idx) => ({
      question: q.question,
      answer: answers[idx],
    }));

    console.log("Customization answers payload:", payload);
    toast.success("Customization submitted successfully!");

    // Placeholder: call createRoadmap with prompt & customization details
    try {
      const response = await createRoadmap({
        title: "Untitled",
        userId: parseInt(session?.user?.id || "1", 10),
      });
      setIsCustomizationOpen(false);
      router.push(`/roadmap/${response.createRoadmap.id}`);
    } catch (e) {
      console.error("Failed to create tailored roadmap", e);
      toast.error("Failed to create tailored roadmap.");
    }
  };

  const handleEditSubmit = async (data: {
    title: string;
    description: string;
  }) => {
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
        (r.description && r.description.toLowerCase().includes(cleanQuery)),
    );
  }, [roadmaps, searchQuery]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [isPending, session, router]);

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

            <div>
              <button
                onClick={handleCreateNewManual}
                className="group relative flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] shadow-2xl shadow-foreground/5 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-linear-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                <Plus className="w-5 h-5" />
                <span>Create New</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Generator Panel */}
        <div className="bg-card/30 border border-border rounded-2xl p-6 mb-12 relative overflow-hidden backdrop-blur-md z-10">
          <div className="absolute inset-0 bg-linear-to-r from-sky-500/5 to-teal-500/5 pointer-events-none" />
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            AI Roadmap Generator
          </h2>
          <p className="text-sm text-muted-foreground mb-4 font-medium">
            Enter a skill or topic you want to learn. SkillFlow will construct a
            personalized learning path.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Next.js 16 with Typescript, Kubernetes for Beginners, Learn Piano..."
                className="flex-1 bg-zinc-900/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-zinc-50"
              />
              <button
                onClick={handleAiSubmit}
                disabled={!aiPrompt.trim() || isQuestionsLoading}
                className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 text-sm"
              >
                {isQuestionsLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Generate Path</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCustomize(!customize)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 max-w-md text-left cursor-pointer group ${
                customize
                  ? "bg-sky-500/10 border-sky-500/40 hover:bg-sky-500/15"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex flex-col gap-0.5 mr-6">
                <span className="text-sm font-bold text-zinc-200 transition-colors group-hover:text-zinc-100">
                  Customization Questions
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Tailor the learning path options using AI questions
                </span>
              </div>

              <div className="relative flex items-center shrink-0">
                <div
                  className={`w-10 h-6 rounded-full transition-all duration-300 border ${
                    customize
                      ? "bg-sky-500/25 border-sky-500/50"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                />
                <div
                  className={`absolute w-4 h-4 bg-zinc-400 rounded-full transition-all duration-300 ${
                    customize ? "translate-x-5 bg-sky-400" : "translate-x-1"
                  }`}
                />
              </div>
            </button>
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

        {isCustomizationOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <h3 className="text-xl font-extrabold text-foreground mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                Tailor Your Learning Path
              </h3>
              <p className="text-xs text-muted-foreground mb-6 font-medium">
                Answer these questions to customize your path for "{aiPrompt}".
              </p>

              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                {customizationQuestions.map((q, idx) => (
                  <div key={idx} className="space-y-2.5">
                    <label className="text-sm font-bold text-zinc-200">
                      {idx + 1}. {q.question}
                    </label>
                    {q.choices && q.choices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.choices.map((choice: string) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => {
                              const newAnswers = [...answers];
                              newAnswers[idx] = choice;
                              setAnswers(newAnswers);
                            }}
                            className={`text-left text-xs px-4 py-3 rounded-xl border transition-all cursor-pointer font-semibold ${
                              answers[idx] === choice
                                ? "bg-sky-500/15 border-sky-500 text-sky-400"
                                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                            }`}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answers[idx] || ""}
                        onChange={(e) => {
                          const newAnswers = [...answers];
                          newAnswers[idx] = e.target.value;
                          setAnswers(newAnswers);
                        }}
                        placeholder="Type your answer..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setIsCustomizationOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomizationSubmit}
                  disabled={answers.some((ans) => !ans || !ans.trim())}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-xl transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  Create Roadmap
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
