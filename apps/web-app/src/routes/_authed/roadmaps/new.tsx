import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useLazyQuery, useMutation } from "@apollo/client/react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { MagicWand01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import {
  CreateRoadmapDocument,
  GenerateRoadmapStreamDocument,
  RoadmapCustomizationQuestionsDocument,
} from "@/gql/graphql"
import { getApiError } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const Route = createFileRoute("/_authed/roadmaps/new")({
  component: NewRoadmapPage,
})

type Question = { question: string; choices: string[] }

function NewRoadmapPage() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [step, setStep] = useState<"topic" | "questions">("topic")
  // Stays true from the moment generation is requested until we navigate away,
  // so the button shows one continuous loading state (no disable→re-enable flash
  // while the create + kickoff requests run).
  const [submitting, setSubmitting] = useState(false)

  const [fetchQuestions, { loading: loadingQuestions }] = useLazyQuery(
    RoadmapCustomizationQuestionsDocument
  )
  const [createRoadmap, { loading: creating }] = useMutation(
    CreateRoadmapDocument
  )
  const [generateRoadmapStream] = useMutation(GenerateRoadmapStreamDocument)

  const handleTopicSubmit = async () => {
    const trimmed = topic.trim()
    if (!trimmed) return
    try {
      const res = await fetchQuestions({ variables: { message: trimmed } })
      const qs: Question[] = (
        res.data?.roadmapCustomizationQuestions ?? []
      ).filter((q) => q.choices.length > 0)
      if (qs.length === 0) {
        // No personalization needed — generate straight away.
        await startGeneration(trimmed, [])
        return
      }
      setQuestions(qs)
      setStep("questions")
    } catch (e) {
      console.error(e)
      toast.error(getApiError(e).message)
    }
  }

  const startGeneration = async (
    finalTopic: string,
    finalAnswers: string[]
  ) => {
    setSubmitting(true)
    try {
      const res = await createRoadmap({
        variables: { input: { title: finalTopic } },
      })
      const id = res.data?.createRoadmap.id
      if (!id) throw new Error("createRoadmap returned no id")
      // Fire the kickoff but don't await it — the request is dispatched
      // immediately and the server streams in the background, so we navigate
      // to the viewer right away instead of blocking the redirect on it.
      void generateRoadmapStream({
        variables: {
          roadmapId: id,
          topic: finalTopic,
          customizationAnswers: finalAnswers,
        },
      }).catch((e) => console.error("generation kickoff failed", e))
      navigate({
        to: "/roadmaps/$id",
        params: { id: String(id) },
        search: { topic: finalTopic },
      })
      // Leave `submitting` true — we're navigating away.
    } catch (e) {
      console.error(e)
      toast.error(getApiError(e).message)
      setSubmitting(false)
    }
  }

  // Manual mode: create an empty roadmap (no generation) and open the editor.
  const createBlank = async () => {
    setSubmitting(true)
    try {
      const res = await createRoadmap({
        variables: { input: { title: topic.trim() || "Untitled roadmap" } },
      })
      const id = res.data?.createRoadmap.id
      if (!id) throw new Error("createRoadmap returned no id")
      navigate({ to: "/roadmaps/$id", params: { id: String(id) }, search: {} })
    } catch (e) {
      console.error(e)
      toast.error(getApiError(e).message)
      setSubmitting(false)
    }
  }

  const allAnswered = questions.every((_, i) => answers[i])

  const handleGenerate = () => {
    const ordered = questions.map((q, i) => `${q.question}: ${answers[i]}`)
    void startGeneration(topic.trim(), ordered)
  }

  return (
    <div className="w-full">
      {step === "topic" ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a roadmap</CardTitle>
            <CardDescription>
              Tell us what you want to learn and we'll generate a personalized
              path — or start blank and build it yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              autoFocus
              placeholder="e.g. Become a backend engineer with Node.js and Postgres"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              variant="ghost"
              onClick={createBlank}
              disabled={loadingQuestions || submitting}
            >
              Start blank
            </Button>
            <Button
              onClick={handleTopicSubmit}
              disabled={!topic.trim() || loadingQuestions || submitting}
            >
              {loadingQuestions || submitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  data-icon="inline-start"
                />
              )}
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Personalize your roadmap</CardTitle>
            <CardDescription>
              A few questions so we tailor the path to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {questions.map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="text-sm font-medium">{q.question}</p>
                <ToggleGroup
                  variant="outline"
                  spacing={2}
                  className="flex-wrap justify-start"
                  value={answers[i] ? [answers[i]] : []}
                  onValueChange={(v: string[]) =>
                    setAnswers((prev) => ({ ...prev, [i]: v[0] ?? "" }))
                  }
                >
                  {q.choices.map((choice) => (
                    <ToggleGroupItem
                      key={choice}
                      value={choice}
                      className="cursor-pointer aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                    >
                      {choice}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            ))}
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep("topic")}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!allAnswered || creating || submitting}
            >
              {creating || submitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={MagicWand01Icon}
                  data-icon="inline-start"
                />
              )}
              Generate roadmap
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
