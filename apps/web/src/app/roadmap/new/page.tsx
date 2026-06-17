"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RoadmapCreator } from "@/components/roadmap/RoadmapCreator";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NewRoadmapPage() {
  // const { isAuthenticated, isLoading } = useConvexAuth();
  // const router = useRouter();
  // const currentUser = useQuery(api.myFunctions.currentUser);

  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.push("/signin");
  //   }
  // }, [isAuthenticated, isLoading, router]);

  // if (isLoading || currentUser === undefined) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="flex items-center gap-3">
  //         <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
  //         <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
  //         <div className="w-2 h-2 bg-sky-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
  //       </div>
  //     </div>
  //   );
  // }

  // if (!isAuthenticated || !currentUser) {
  //   return null;
  // }

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
        {/* <RoadmapCreator userId={1} /> */}
      </main>
    </div>
  );
}
