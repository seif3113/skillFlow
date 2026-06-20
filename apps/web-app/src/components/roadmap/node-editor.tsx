import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  LinkSquare02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { useForm } from "@tanstack/react-form"

import { UpdateNodeDocument, SearchNodeResourcesDocument } from "@/gql/graphql"
import {
  asResources,
  asTags,
  type RoadmapNode,
  type RoadmapResource,
} from "@/lib/roadmap-graph"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

type EditorValues = {
  title: string
  description: string
  tags: string[]
  resources: RoadmapResource[]
}

function valuesFromNode(node: RoadmapNode): EditorValues {
  return {
    title: node.title ?? "",
    description: node.description ?? "",
    tags: asTags(node.tags),
    resources: asResources(node.resources),
  }
}

// TanStack Form instance for editing a node. `onSaved` only fires on a
// successful UpdateNode, so the caller can close the editor + sync the canvas.
export function useNodeEditor({
  node,
  onSaved,
}: {
  node: RoadmapNode
  onSaved: (node: RoadmapNode) => void
}) {
  const [update] = useMutation(UpdateNodeDocument)

  return useForm({
    defaultValues: valuesFromNode(node),
    onSubmit: async ({ value }) => {
      try {
        const res = await update({
          variables: {
            input: {
              id: node.id,
              title: value.title.trim(),
              description: value.description.trim() || null,
              tags: value.tags,
              resources: value.resources,
            },
          },
        })
        const updated = res.data?.updateNode
        if (updated) onSaved(updated)
      } catch (e) {
        // Leave the editor open so edits aren't lost; surface the failure.
        console.error(e)
        toast.error("Couldn't save changes. Please try again.")
      }
    },
  })
}

export type NodeEditorForm = ReturnType<typeof useNodeEditor>

// Reset the form to a node's current values — used when (re)entering edit mode
// so each session starts from what's actually persisted.
export function resetEditorToNode(form: NodeEditorForm, node: RoadmapNode) {
  form.reset(valuesFromNode(node))
}

export function NodeEditFields({ form }: { form: NodeEditorForm }) {
  return (
    <div className="flex flex-col gap-5">
      <form.Field
        name="title"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value.trim() ? undefined : "Title is required",
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Topic title"
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-description">Description</Label>
            <Textarea
              id="node-description"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
              placeholder="What this topic covers…"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="tags">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <TagInput
              value={field.state.value}
              onChange={(tags) => field.handleChange(tags)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="resources">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label>Resources</Label>
            <ResourceList
              value={field.state.value}
              onChange={(resources) => field.handleChange(resources)}
            />
            <ResourceSearch
              existing={field.state.value}
              onAdd={(resource) =>
                field.handleChange([...field.state.value, resource])
              }
            />
          </div>
        )}
      </form.Field>
    </div>
  )
}

function FieldError({ errors }: { errors: unknown[] }) {
  const first = errors.find((e) => e != null)
  if (!first) return null
  const message =
    typeof first === "string"
      ? first
      : typeof first === "object" && "message" in first
        ? String((first as { message: unknown }).message)
        : String(first)
  return <p className="text-xs text-destructive">{message}</p>
}

function TagInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [text, setText] = useState("")

  const add = () => {
    const tag = text.trim()
    if (!tag || value.includes(tag)) {
      setText("")
      return
    }
    onChange([...value, tag])
    setText("")
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add()
          }
        }}
        placeholder="Add a tag and press Enter"
      />
    </div>
  )
}

function ResourceList({
  value,
  onChange,
}: {
  value: RoadmapResource[]
  onChange: (value: RoadmapResource[]) => void
}) {
  if (value.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {value.map((resource, i) => (
        <div
          key={`${resource.url ?? resource.title ?? "resource"}-${i}`}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <HugeiconsIcon
            icon={LinkSquare02Icon}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="flex-1 truncate">
            {resource.title ?? resource.url}
          </span>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Remove resource"
            className="rounded-full p-1 text-muted-foreground hover:bg-foreground/10"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

const RESOURCE_TYPES = ["all", "video", "article", "course"] as const

type SearchResultItem = { id: string; resource: RoadmapResource }

function parseSearchResults(json: unknown): SearchResultItem[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((item, i): SearchResultItem[] => {
    if (!item || typeof item !== "object") return []
    const rec = item as Record<string, unknown>
    const resource = rec.resource
    if (!resource || typeof resource !== "object") return []
    const r = resource as Record<string, unknown>
    const str = (v: unknown) => (typeof v === "string" ? v : undefined)
    return [
      {
        id: str(rec.id) ?? String(i),
        resource: {
          title: str(r.title),
          url: str(r.url),
          description: str(r.description),
          type: str(r.type),
        },
      },
    ]
  })
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function ResourceSearch({
  existing,
  onAdd,
}: {
  existing: RoadmapResource[]
  onAdd: (resource: RoadmapResource) => void
}) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState<(typeof RESOURCE_TYPES)[number]>("all")
  const topic = useDebounced(query.trim(), 350)
  const enabled = topic.length >= 3

  const { data, loading } = useQuery(SearchNodeResourcesDocument, {
    variables: { topic, limit: 8, type },
    skip: !enabled,
  })

  const results = parseSearchResults(data?.searchNodeResources)
  const existingUrls = new Set(
    existing.map((r) => r.url).filter((u): u is string => !!u)
  )

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for videos, articles, courses…"
      />

      <div className="flex flex-wrap gap-1">
        {RESOURCE_TYPES.map((t) => (
          <Button
            key={t}
            type="button"
            size="xs"
            variant={type === t ? "default" : "outline"}
            onClick={() => setType(t)}
          >
            {t === "all" ? "All" : t[0].toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {!enabled ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">
          Type at least 3 characters to search.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Searching…
        </div>
      ) : results.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">
          No resources found.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {results.map((item) => {
            const r = item.resource
            const added = !!r.url && existingUrls.has(r.url)
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {r.title ?? r.url}
                  </span>
                  {r.description ? (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {r.description}
                    </span>
                  ) : null}
                  {r.type ? (
                    <span className="mt-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                      {r.type}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={added}
                  onClick={() => onAdd(r)}
                  aria-label={added ? "Already added" : "Add resource"}
                  className={cn(added && "text-primary")}
                >
                  <HugeiconsIcon
                    icon={added ? CheckmarkCircle02Icon : PlusSignIcon}
                  />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
