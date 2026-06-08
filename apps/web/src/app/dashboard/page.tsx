"use client";

import { RoadmapList } from "@/components/roadmap";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  // const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.push("/signin");
  //   }
  // }, [isAuthenticated, isLoading, router]);

  // if (isLoading || !isAuthenticated) {
  //   return (
  //     <div style={{
  //       background: 'radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(20, 184, 166, 0.15) 0%, transparent 50%)',
  //     }} className="min-h-screen flex items-center justify-center">
  //       <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
  //     </div>
  //   );
  // }

  return <Dashboard />;
}

function Dashboard() {
  // const { signOut } = useAuthActions();
  const router = useRouter();
  // const currentUser = useQuery(api.myFunctions.currentUser);
  // const roadmaps = useQuery(
  //   api.roadmaps.list,
  //   currentUser?._id ? { userId: currentUser._id } : "skip"
  // );
  // const deleteRoadmap = useMutation(api.roadmaps.deleteRoadmap);

  // const handleDelete = async (id: Id<"roadmaps">) => {
  //   if (confirm("Are you sure you want to delete this roadmap?")) {
  //     await deleteRoadmap({ id });
  //   }
  // };

  // if (currentUser === undefined || (currentUser && roadmaps === undefined)) {
  //   return (
  //     <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
  //       <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
  //     </div>
  //   );
  // }

  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(20, 184, 166, 0.15) 0%, transparent 50%)",
      }}
      className="min-h-screen bg-zinc-950"
    >
      <header className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="flex items-center gap-2" href="/">
              <div className="inline-flex items-center justify-center rounded-2xl">
                <Image
                  src="/favicon.svg"
                  alt="SkillFlow Logo"
                  width={50}
                  height={50}
                />
              </div>
              <span className="text-zinc-100 font-bold text-xl tracking-tight">
                SkillFlow
              </span>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-zinc-300 text-sm"
            onClick={() => void (() => router.push("/signin"))}
            // onClick={() => void signOut().then(() => router.push("/signin"))}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Your Roadmaps</h1>
          <Link href="/roadmap/new">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-100"
              style={{
                background: "linear-gradient(90deg, #0284c7 0%, #0d9488 100%)",
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New
            </button>
          </Link>
        </div>

        <RoadmapList roadmaps={[]} onDelete={() => {}} />
      </main>
    </div>
  );
}
