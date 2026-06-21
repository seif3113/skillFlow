import { useState } from "react"
import { useMutation } from "@apollo/client/react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
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
import { getApiError } from "@/lib/api-error"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type Quiz = QuizFieldsFragment
export type QuizResult = SubmitQuizAttemptMutation["submitQuizAttempt"]
export type QuizMode = "idle" | "taking" | "result"

const toChoices = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((c): c is string => typeof c === "string") : []

// Quiz state machine for a single node: generate → take → grade. Lifted into a
// hook so the sheet can drive the body and footer from the same state.
export function useNodeQuiz(nodeId: number, onPassed: () => void) {
  const [generate, { loading: generating }] = useMutation(
    GenerateNodeQuizDocument
  )
  const [submit, { loading: submitting }] = useMutation(
    SubmitQuizAttemptDocument
  )
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const mode: QuizMode = result ? "result" : quiz ? "taking" : "idle"
  const allAnswered =
    quiz != null && quiz.questions.every((q) => answers[q.id] !== undefined)

  const start = async () => {
    setResult(null)
    setAnswers({})
    try {
      const res = await generate({ variables: { nodeId } })
      if (res.data?.generateNodeQuiz) setQuiz(res.data.generateNodeQuiz)
    } catch (e) {
      console.error(e)
      toast.error(getApiError(e).message)
    }
  }

  const setAnswer = (questionId: number, choice: number) =>
    setAnswers((prev) => ({ ...prev, [questionId]: choice }))

  const submitAttempt = async () => {
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
      toast.error(getApiError(e).message)
    }
  }

  const retry = () => {
    setResult(null)
    setAnswers({})
  }

  const reset = () => {
    setQuiz(null)
    setAnswers({})
    setResult(null)
  }

  return {
    mode,
    quiz,
    answers,
    result,
    allAnswered,
    generating,
    submitting,
    start,
    setAnswer,
    submitAttempt,
    retry,
    reset,
  }
}

export function QuizQuestions({
  quiz,
  answers,
  onAnswer,
}: {
  quiz: Quiz
  answers: Record<number, number>
  onAnswer: (questionId: number, choice: number) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {qi + 1}. {q.question}
          </p>
          <ToggleGroup
            variant="outline"
            spacing={2}
            orientation="vertical"
            className="w-full items-stretch"
            value={answers[q.id] !== undefined ? [String(answers[q.id])] : []}
            onValueChange={(v: string[]) =>
              v[0] !== undefined && onAnswer(q.id, Number(v[0]))
            }
          >
            {toChoices(q.choices).map((choice, ci) => (
              <ToggleGroupItem
                key={ci}
                value={String(ci)}
                className="h-auto w-full justify-start gap-3 py-2.5 text-left whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded border bg-muted/60 text-xs font-medium text-muted-foreground">
                  {String.fromCharCode(65 + ci)}
                </span>
                <span className="flex-1">{choice}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}
    </div>
  )
}

export function QuizResults({
  quiz,
  result,
  answers,
}: {
  quiz: Quiz
  result: QuizResult
  answers: Record<number, number>
}) {
  const byId = new Map(result.results.map((r) => [r.questionId, r]))
  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-3",
          result.passed
            ? "border-primary/40 bg-primary/5"
            : "border-destructive/40 bg-destructive/5"
        )}
      >
        <HugeiconsIcon
          icon={result.passed ? CheckmarkCircle02Icon : CancelCircleIcon}
          className={cn(
            "size-6 shrink-0",
            result.passed ? "text-primary" : "text-destructive"
          )}
        />
        <div>
          <p className="text-sm font-medium">
            {result.passed ? "Passed — node completed" : "Not passed"}
          </p>
          <p className="text-xs text-muted-foreground">
            Scored {result.score}% (need {result.passThreshold}% to pass)
          </p>
        </div>
      </div>

      {quiz.questions.map((q, qi) => {
        const r = byId.get(q.id)
        const choices = toChoices(q.choices)

        return (
          <div key={q.id} className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {qi + 1}. {q.question}
            </p>
            <div className="flex flex-col gap-1">
              {choices.map((choice, ci) => {
                const isCorrect = r?.correctAnswer === ci
                const isPicked = answers[q.id] === ci

                // Passed → reveal correct answer (green) and wrong pick (red)
                // Failed → only colour what the user picked: green if right, red if wrong
                //          never highlight unpicked choices (hides correct answer)
                const highlightGreen =
                  (result.passed && isCorrect) ||
                  (!result.passed && isPicked && isCorrect)
                const highlightRed = isPicked && !isCorrect

                return (
                  <div
                    key={ci}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-1.5 text-sm",
                      highlightGreen && "border-primary/50 bg-primary/10",
                      highlightRed && "border-destructive/50 bg-destructive/10"
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded border bg-muted/60 text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(65 + ci)}
                    </span>
                    <span className="flex-1">{choice}</span>
                  </div>
                )
              })}
            </div>
            {result.passed && r?.explanation ? (
              <p className="text-xs text-muted-foreground">{r.explanation}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
