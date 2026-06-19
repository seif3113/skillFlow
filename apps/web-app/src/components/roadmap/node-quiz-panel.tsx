import { useState } from "react"
import { useMutation } from "@apollo/client/react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Quiz01Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons"

import {
  GenerateNodeQuizDocument,
  SubmitQuizAttemptDocument,
  type QuizFieldsFragment,
  type SubmitQuizAttemptMutation,
} from "@/gql/graphql"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Quiz = QuizFieldsFragment
type QuizResult = SubmitQuizAttemptMutation["submitQuizAttempt"]

const toChoices = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((c): c is string => typeof c === "string") : []

export function NodeQuizPanel({
  nodeId,
  isCompleted,
  onPassed,
}: {
  nodeId: number
  isCompleted: boolean
  onPassed: () => void
}) {
  const [generate, { loading: generating }] = useMutation(
    GenerateNodeQuizDocument,
  )
  const [submit, { loading: submitting }] = useMutation(
    SubmitQuizAttemptDocument,
  )

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const reset = () => {
    setQuiz(null)
    setAnswers({})
    setResult(null)
  }

  const start = async () => {
    setResult(null)
    setAnswers({})
    try {
      const res = await generate({ variables: { nodeId } })
      if (res.data?.generateNodeQuiz) setQuiz(res.data.generateNodeQuiz)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't load the quiz. Please try again.")
    }
  }

  const allAnswered =
    quiz != null && quiz.questions.every((q) => answers[q.id] !== undefined)

  const handleSubmit = async () => {
    if (!quiz || !allAnswered) return
    const ordered = quiz.questions.map((q) => answers[q.id])
    try {
      const res = await submit({ variables: { nodeId, answers: ordered } })
      const r = res.data?.submitQuizAttempt
      if (!r) return
      setResult(r)
      if (r.passed) onPassed()
    } catch (e) {
      console.error(e)
      toast.error("Couldn't submit the quiz. Please try again.")
    }
  }

  // --- Results ---
  if (result && quiz) {
    const resultsById = new Map(result.results.map((r) => [r.questionId, r]))
    return (
      <div className="flex flex-col gap-4 border-t p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            result.passed
              ? "border-primary/40 bg-primary/5"
              : "border-destructive/40 bg-destructive/5",
          )}
        >
          <HugeiconsIcon
            icon={result.passed ? CheckmarkCircle02Icon : CancelCircleIcon}
            className={cn(
              "size-6 shrink-0",
              result.passed ? "text-primary" : "text-destructive",
            )}
          />
          <div>
            <p className="font-medium text-sm">
              {result.passed ? "Passed — node completed" : "Not passed"}
            </p>
            <p className="text-muted-foreground text-xs">
              Scored {result.score}% (need {result.passThreshold}% to pass)
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {quiz.questions.map((q, qi) => {
            const r = resultsById.get(q.id)
            const choices = toChoices(q.choices)
            return (
              <div key={q.id} className="flex flex-col gap-1.5">
                <p className="font-medium text-sm">
                  {qi + 1}. {q.question}
                </p>
                <div className="flex flex-col gap-1">
                  {choices.map((choice, ci) => {
                    const isCorrect = r?.correctAnswer === ci
                    const isPicked = answers[q.id] === ci
                    return (
                      <div
                        key={ci}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm",
                          isCorrect && "border-primary/50 bg-primary/10",
                          isPicked &&
                            !isCorrect &&
                            "border-destructive/50 bg-destructive/10",
                        )}
                      >
                        {choice}
                      </div>
                    )
                  })}
                </div>
                {r?.explanation ? (
                  <p className="text-muted-foreground text-xs">
                    {r.explanation}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          {result.passed ? (
            <Button variant="outline" className="w-full" onClick={reset}>
              Done
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setResult(null)
                setAnswers({})
              }}
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    )
  }

  // --- Taking ---
  if (quiz) {
    return (
      <div className="flex flex-col gap-5 border-t p-4">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="flex flex-col gap-2">
            <p className="font-medium text-sm">
              {qi + 1}. {q.question}
            </p>
            <ToggleGroup
              variant="outline"
              spacing={2}
              orientation="vertical"
              className="items-stretch"
              value={
                answers[q.id] !== undefined ? [String(answers[q.id])] : []
              }
              onValueChange={(v: string[]) =>
                setAnswers((prev) =>
                  v[0] === undefined
                    ? prev
                    : { ...prev, [q.id]: Number(v[0]) },
                )
              }
            >
              {toChoices(q.choices).map((choice, ci) => (
                <ToggleGroupItem
                  key={ci}
                  value={String(ci)}
                  className="h-auto justify-start whitespace-normal py-2 text-left aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                >
                  {choice}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={reset} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            Submit answers
          </Button>
        </div>
      </div>
    )
  }

  // --- Idle ---
  return (
    <div className="flex flex-col gap-3 border-t p-4">
      {isCompleted ? (
        <div className="flex items-center gap-2 font-medium text-primary text-sm">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
          Completed
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Pass a short quiz to mark this topic complete.
        </p>
      )}
      <Button
        className="w-full"
        variant={isCompleted ? "outline" : "default"}
        disabled={generating}
        onClick={start}
      >
        {generating ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <HugeiconsIcon icon={Quiz01Icon} data-icon="inline-start" />
        )}
        {isCompleted ? "Retake quiz" : "Take quiz to complete"}
      </Button>
    </div>
  )
}
