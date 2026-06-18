"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Brain,
  Sparkles,
  Target,
  ArrowRight,
  MousePointer2,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { RoadmapPreview } from "@/components/roadmap/RoadmapPreview";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  authClient.getSession().then((session) => {
    setIsAuthenticated(!!session);
  });
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

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
          <a
            href="#features"
            className="hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How it Works
          </a>
          <div className="flex items-center gap-4 border-l border-border pl-8">
            <ThemeToggle />
            <Link href={`${isAuthenticated ? "/dashboard" : "/signin"}`}>
              <button className="bg-foreground text-background px-6 py-2.5 rounded-full font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-foreground/5">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/5 border border-sky-500/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-sky-400">
            Future-Proof Learning
          </span>
        </div>

        <h1 className="text-6xl md:text-[7.5rem] font-black tracking-tighter leading-[0.85] max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          MASTER ANY <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-400 to-teal-400">
            SKILL.
          </span>
        </h1>

        <p className="mt-10 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          Personalized learning roadmaps powered by AI. From profile analysis to
          resource curation, we build your path to mastery.
        </p>

        <div className="mt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <Link href={`${isAuthenticated ? "/dashboard" : "/signin"}`}>
            <button className="group relative px-10 py-5 bg-sky-600 rounded-2xl font-black text-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-sky-500/20">
              <div className="absolute inset-0 bg-linear-to-r from-sky-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center gap-3 text-white">
                Build My Roadmap{" "}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </Link>
        </div>

        {/* Interactive Preview Canvas */}
        <div className="mt-28 w-full max-w-5xl rounded-3xl border border-border bg-card/20 backdrop-blur-sm h-[500px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700 relative group">
          <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border border-border">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
              Live Preview Canvas
            </span>
          </div>
          <RoadmapPreview />
        </div>
      </header>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="relative z-10 max-w-7xl mx-auto px-6 py-40 w-full"
      >
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto">
            Choose your preferred way to build your expertise. Fully automated
            or manually curated.
          </p>
        </div>

        <div className="flex flex-col items-center">
          {/* Custom Tabs */}
          <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border mb-12">
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-8 py-3.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all ${
                activeTab === "ai"
                  ? "bg-background text-foreground shadow-xl"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Generated
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-8 py-3.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all ${
                activeTab === "manual"
                  ? "bg-background text-foreground shadow-xl"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual Build
            </button>
          </div>

          {/* Tab Content */}
          <div className="w-full max-w-5xl bg-card/30 border border-border rounded-3xl p-12 md:p-16 min-h-[400px] flex flex-col md:flex-row gap-16 items-center">
            {activeTab === "ai" ? (
              <>
                <div className="flex-1 space-y-10">
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <ClipboardList className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        1. Profile Assessment
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Answer a few targeted questions about your current
                        experience, learning style, and specific targets.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <Brain className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        2. AI Logic Mapping
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Our AI analyzes your profile to create a logical
                        sequence of milestones tailored to your pace.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        3. Instant Roadmap
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Get a complete, interactive roadmap with curated
                        resources ready for you to start learning immediately.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full aspect-square bg-background rounded-2xl border border-border p-8 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-[60%] bg-sky-500 animate-in slide-in-from-left duration-1000" />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black tracking-widest uppercase text-sky-500">
                        Analyzing Experience...
                      </span>
                      <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
                        60%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-10">
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <MousePointer2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        1. Manual Node Creation
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Architect your own learning path by adding and
                        connecting nodes on our infinite canvas.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <ClipboardList className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        2. Resource Curation
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Select high-quality resources from our dynamically
                        fetched list of courses, videos, and articles.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        3. AI-Assisted Editing
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        Use the integrated AI assistant to refine descriptions,
                        find missing topics, or explain complex nodes.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full aspect-square bg-background rounded-2xl border border-border p-8 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-card rounded-xl border border-border flex items-center justify-center"
                      >
                        <div className="w-8 h-1 bg-muted rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full"
      >
        <div className="mb-20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Designed for Depth.
          </h2>
          <p className="text-muted-foreground text-lg font-medium">
            Powerful features that turn information into knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[280px]">
          {/* Smart AI Generation */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-3xl border border-border bg-card/20 p-10 hover:border-sky-500/30 transition-all">
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 blur-[100px] -mr-40 -mt-40" />
            <Brain className="w-12 h-12 text-sky-400 mb-8" />
            <h3 className="text-3xl font-black mb-4">Adaptive AI Engine</h3>
            <p className="text-muted-foreground font-medium max-w-md text-lg leading-relaxed">
              Our LLM-orchestrated engine builds complex skill trees that adapt
              to your progress and existing knowledge base.
            </p>
          </div>

          {/* Goal Oriented */}
          <div className="md:col-span-4 group relative overflow-hidden rounded-3xl border border-border bg-card/20 p-10 hover:border-teal-500/30 transition-all">
            <Target className="w-12 h-12 text-teal-400 mb-8" />
            <h3 className="text-2xl font-black mb-4 tracking-tight">
              Outcome Focused
            </h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Define your end goal. We'll strip away the noise and build the
              shortest path to mastery.
            </p>
          </div>

          {/* RAG Pipeline */}
          <div className="md:col-span-4 group relative overflow-hidden rounded-3xl border border-border bg-card/20 p-10 hover:border-muted transition-all">
            <Sparkles className="w-12 h-12 text-foreground mb-8" />
            <h3 className="text-2xl font-black mb-4 tracking-tight">
              Verified Resources
            </h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Real-time resource fetching from top platforms via our proprietary
              RAG infrastructure.
            </p>
          </div>

          {/* Interactive Chat */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-3xl border border-border bg-card/20 p-10 hover:border-sky-500/30 transition-all flex flex-col md:flex-row gap-10">
            <div className="flex-1">
              <h3 className="text-3xl font-black mb-4">Contextual AI Chat</h3>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                Refine your roadmap in real-time. Ask for summaries, add deeper
                dive sub-nodes, or switch resources instantly.
              </p>
            </div>
            <div className="flex-1 bg-background/40 rounded-2xl border border-border p-6 flex flex-col gap-4">
              <div className="h-2 w-2/3 bg-card rounded-full" />
              <div className="h-2 w-1/2 bg-card rounded-full" />
              <div className="h-2 w-3/4 bg-sky-500/10 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-32 px-6 border-t border-border mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-8">
              <Image
                src="/favicon.svg"
                alt="SkillFlow Logo"
                width={36}
                height={36}
              />
              <span className="text-foreground font-bold text-2xl tracking-tight">
                SkillFlow
              </span>
            </div>
            <p className="text-muted-foreground max-w-sm font-medium leading-relaxed">
              The AI-native infrastructure for personalized learning.
              Architecting the future of human potential.
            </p>
          </div>
          <div>
            <h4 className="text-foreground font-black mb-6 text-xs uppercase tracking-[0.3em]">
              Legal
            </h4>
            <ul className="space-y-4 text-sm text-muted-foreground font-bold">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-foreground font-black mb-6 text-xs uppercase tracking-[0.3em]">
              Connect
            </h4>
            <ul className="space-y-4 text-sm text-muted-foreground font-bold">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-32 pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black tracking-widest uppercase text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} SkillFlow. Built for the era of
            intelligence.
          </p>
          <div className="flex gap-10">
            <a href="#" className="hover:text-foreground transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
