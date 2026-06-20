import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "@apollo/client/react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Route01Icon } from "@hugeicons/core-free-icons"

import { MyRoadmapsDocument, DeleteRoadmapDocument } from "@/gql/graphql"
import {
  RoadmapCard,
  type RoadmapListItem,
} from "@/components/roadmap/roadmap-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export const Route = createFileRoute("/_authed/roadmaps/")({
  component: RoadmapsPage,
})

function RoadmapsPage() {
  const { data, loading, refetch } = useQuery(MyRoadmapsDocument)
  const [deleteTarget, setDeleteTarget] = useState<RoadmapListItem | null>(null)
  const [deleteRoadmap, { loading: deleting }] =
    useMutation(DeleteRoadmapDocument)

  const roadmaps = data?.roadmaps ?? []

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteRoadmap({ variables: { id: deleteTarget.id } })
      await refetch()
      toast.success("Roadmap deleted.")
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete the roadmap.")
    }
    setDeleteTarget(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-xl">My roadmaps</h1>
        <p className="text-muted-foreground text-sm">
          Your AI-generated learning paths.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : roadmaps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Route01Icon} />
            </EmptyMedia>
            <EmptyTitle>No roadmaps yet</EmptyTitle>
            <EmptyDescription>
              Generate your first personalized learning path to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/roadmaps/new" />}>
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Create a roadmap
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <RoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this roadmap?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" and all of its topics will be permanently
              deleted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
