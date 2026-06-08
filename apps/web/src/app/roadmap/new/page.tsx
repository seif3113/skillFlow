"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RoadmapCreator } from "@/components/roadmap/RoadmapCreator";
import Link from "next/link";
import Image from "next/image";

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
  //     <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="inline-flex items-center justify-center rounded-2xl">
              <Image
                src="/favicon.svg"
                alt="SkillFlow Logo"
                width={50}
                height={50}
              />
            </div>
            <h1 className="font-bold text-xl text-zinc-100">SkillFlow</h1>
          </Link>
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>
      <main>{/* <RoadmapCreator userId={1} /> */}</main>
    </div>
  );
}
