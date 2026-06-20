import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@apollo/client/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Award01Icon,
  CancelCircleIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Fire03Icon,
  Quiz01Icon,
  Route01Icon,
} from "@hugeicons/core-free-icons"

import { MyRoadmapsDocument, MyQuizAttemptsDocument } from "@/gql/graphql"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authed/progress")({
  component: ProgressPage,
})

const PASS_THRESHOLD = 70

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

// Consecutive days (ending today or yesterday) with at least one attempt.
function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => new Date(d).toDateString()))
  const cursor = new Date()
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(cursor.toDateString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function ProgressPage() {
  const roadmapsQuery = useQuery(MyRoadmapsDocument)
  const attemptsQuery = useQuery(MyQuizAttemptsDocument)

  const roadmaps = roadmapsQuery.data?.roadmaps ?? []
  const attempts = attemptsQuery.data?.myQuizAttempts ?? []
  const loading = roadmapsQuery.loading || attemptsQuery.loading

  const allNodes = roadmaps.flatMap((r) => r.nodes ?? [])
  const totalTopics = allNodes.length
  const completedTopics = allNodes.filter((n) => n.isCompleted).length
  const completionPct = totalTopics
    ? Math.round((completedTopics / totalTopics) * 100)
    : 0

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0
  const passRate = attempts.length
    ? Math.round(
        (attempts.filter((a) => a.passed).length / attempts.length) * 100
      )
    : 0
  const streak = computeStreak(attempts.map((a) => a.createdAt))

  // Latest attempt per node (attempts come newest-first); those still failing
  // are the topics that need review.
  const latestByNode = new Map<number, (typeof attempts)[number]>()
  for (const a of attempts)
    if (!latestByNode.has(a.nodeId)) latestByNode.set(a.nodeId, a)
  const needsReview = [...latestByNode.values()].filter((a) => !a.passed)
  const recent = attempts.slice(0, 8)

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckmarkCircle02Icon}
          label="Topics completed"
          value={`${completedTopics}/${totalTopics}`}
          hint={`${completionPct}% overall`}
        />
        <StatCard
          icon={Award01Icon}
          label="Average quiz score"
          value={`${avgScore}%`}
          hint={`${attempts.length} attempt${attempts.length === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Quiz01Icon}
          label="Pass rate"
          value={`${passRate}%`}
          hint={`${attempts.filter((a) => a.passed).length} passed`}
        />
        <StatCard
          icon={Fire03Icon}
          label="Day streak"
          value={`${streak}`}
          hint={streak > 0 ? "Keep it going!" : "Take a quiz today"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="size-4.5" />
              Needs review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing to review — every quiz you've taken is passing. 🎉
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {needsReview.map((a) => (
                  <li key={a.nodeId}>
                    <Link
                      to="/roadmaps/$id"
                      params={{ id: String(a.roadmapId) }}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <HugeiconsIcon
                        icon={CancelCircleIcon}
                        className="size-4 shrink-0 text-destructive"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {a.nodeTitle}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.roadmapTitle}
                        </span>
                      </span>
                      <ScoreBadge score={a.score} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} className="size-4.5" />
              Recent quiz activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No quizzes yet. Take a node's quiz to start tracking progress.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recent.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <HugeiconsIcon
                      icon={a.passed ? CheckmarkCircle02Icon : CancelCircleIcon}
                      className={cn(
                        "size-4 shrink-0",
                        a.passed ? "text-primary" : "text-destructive"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {a.nodeTitle}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.roadmapTitle} · {timeAgo(a.createdAt)}
                      </span>
                    </span>
                    <ScoreBadge score={a.score} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Route01Icon} className="size-4.5" />
            Roadmap progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roadmaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No roadmaps yet.{" "}
              <Link to="/roadmaps/new" className="text-primary hover:underline">
                Create your first one.
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {roadmaps.map((r) => {
                const ns = r.nodes ?? []
                const done = ns.filter((n) => n.isCompleted).length
                const pct = ns.length ? Math.round((done / ns.length) * 100) : 0
                return (
                  <li key={r.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <Link
                        to="/roadmaps/$id"
                        params={{ id: String(r.id) }}
                        className="truncate font-medium hover:underline"
                      >
                        {r.title}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {done}/{ns.length} · {pct}%
                      </span>
                    </div>
                    <Progress value={pct} />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PageHeading() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Progress</h1>
      <p className="text-sm text-muted-foreground">
        Your completion, quiz performance, and what to revisit.
      </p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof Quiz01Icon
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreBadge({ score }: { score: number }): ReactNode {
  const passed = score >= PASS_THRESHOLD
  return (
    <Badge
      variant="secondary"
      className={cn(
        "shrink-0",
        passed
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {score}%
    </Badge>
  )
}
