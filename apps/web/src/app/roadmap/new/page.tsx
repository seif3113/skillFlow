"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RoadmapCreator } from "@/components/roadmap/RoadmapCreator";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NewRoadmapPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-sky-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="inline-flex items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-sky-500/10">
              <Image
                src="/favicon.svg"
                alt="SkillFlow Logo"
                width={40}
                height={40}
              />
            </div>
            <h1 className="font-bold text-xl text-foreground">SkillFlow</h1>
          </Link>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-12 px-6">
        <Suspense
          fallback={
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <NewRoadmapContent userId={parseInt(session.user.id, 10) || 1} />
        </Suspense>
      </main>
    </div>
  );
}

function NewRoadmapContent({ userId }: { userId: number }) {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") || undefined;
  return <RoadmapCreator userId={userId} initialTopic={topic} />;
}
