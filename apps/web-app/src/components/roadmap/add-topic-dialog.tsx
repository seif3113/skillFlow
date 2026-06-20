import { useState, type FormEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useRoadmapView } from "./roadmap-view-context"

// Manually add a topic to the roadmap. Used in the viewer header and in the
// empty-canvas state. The created node lands on the canvas; its prerequisites
// can then be drawn by dragging.
export function AddTopicDialog({
  variant = "outline",
  size = "sm",
}: {
  variant?: "outline" | "default"
  size?: "sm" | "default"
}) {
  const { actions } = useRoadmapView()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const node = await actions.addNode(trimmed, description.trim() || undefined)
    setSaving(false)
    if (node) {
      setTitle("")
      setDescription("")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
        Add topic
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a topic</DialogTitle>
          <DialogDescription>
            Add a topic to this roadmap. You can link prerequisites and attach
            resources afterwards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="Topic title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              )}
              Add topic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
