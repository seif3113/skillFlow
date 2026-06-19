import { createFileRoute, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  MagicWand01Icon,
  Route01Icon,
  Quiz01Icon,
  PencilEdit02Icon,
  AiChat02Icon,
  Compass01Icon,
  ChartLineData01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute("/_authed/help")({
  component: HelpPage,
})

const STEPS = [
  {
    icon: MagicWand01Icon,
    title: "Generate a roadmap",
    body: "Describe any topic and AI builds a personalized, prerequisite-ordered learning path for it.",
  },
  {
    icon: Route01Icon,
    title: "Learn topic by topic",
    body: "Open a node to see its description, tags, and curated resources. Drag a node's bottom dot onto another to set a prerequisite.",
  },
  {
    icon: Quiz01Icon,
    title: "Pass quizzes to complete",
    body: "Each topic is completed by passing its AI-generated quiz (70%+) — there's no manual checkbox, so completion always means you've shown the knowledge.",
  },
  {
    icon: PencilEdit02Icon,
    title: "Edit anything",
    body: "Edit a topic's title, description, and tags, and search the web for resources to attach — right from the node panel.",
  },
  {
    icon: AiChat02Icon,
    title: "Ask the assistant",
    body: "Open “Ask AI” on a roadmap to ask questions about it or have the assistant add, edit, and link topics for you.",
  },
  {
    icon: Compass01Icon,
    title: "Explore & share",
    body: "Publish your roadmap to the Explore directory, browse what others have shared, and fork any roadmap to make it your own.",
  },
  {
    icon: ChartLineData01Icon,
    title: "Track your progress",
    body: "The Progress page shows your completion, quiz performance, the topics to review, and your day streak.",
  },
]

function HelpPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Help</h1>
        <p className="text-sm text-muted-foreground">
          How SkillFlow works, end to end.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card>
              <CardContent className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={step.icon}
                      className="size-4.5 text-primary"
                    />
                    <h2 className="font-medium">{step.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link to="/roadmaps/new" />}>
          <HugeiconsIcon icon={MagicWand01Icon} data-icon="inline-start" />
          Create a roadmap
        </Button>
        <Button variant="outline" render={<Link to="/explore" />}>
          <HugeiconsIcon icon={Compass01Icon} data-icon="inline-start" />
          Explore roadmaps
        </Button>
      </div>
    </div>
  )
}
