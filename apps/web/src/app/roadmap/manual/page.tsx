"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useCreateRoadmap } from "@/hooks/useRoadmap";
import { InitRoadmapDialog } from "@/components/roadmap/InitRoadmapDialog";

export default function ManualRoadmapPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { mutateAsync: createRoadmap, isPending: isCreating } =
    useCreateRoadmap();
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [isPending, session, router]);

  const handleInitSubmit = async (data: {
    title: string;
    description: string;
  }) => {
    if (!session) return;
    try {
      const response = await createRoadmap({
        title: data.title,
        description: data.description,
        userId: parseInt(session.user.id, 10),
      });
      const id = response.createRoadmap.id;
      router.push(`/roadmap/${id}`);
    } catch (e) {
      console.error("Failed to create roadmap", e);
      alert("Failed to create new roadmap.");
      setIsDialogOpen(true);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      router.push("/dashboard");
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
      {isCreating ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">
            Creating your new roadmap...
          </p>
        </div>
      ) : (
        <InitRoadmapDialog
          open={isDialogOpen}
          onOpenChange={handleOpenChange}
          onSubmit={handleInitSubmit}
        />
      )}
    </div>
  );
}
