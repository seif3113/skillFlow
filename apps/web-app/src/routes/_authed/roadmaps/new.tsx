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
import { AppShell } from "@/components/app-shell"
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

  const [fetchQuestions, { loading: loadingQuestions }] = useLazyQuery(
    RoadmapCustomizationQuestionsDocument,
  )
  const [createRoadmap, { loading: creating }] =
    useMutation(CreateRoadmapDocument)
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
      toast.error("Couldn't load customization questions. Please try again.")
    }
  }

  const startGeneration = async (finalTopic: string, finalAnswers: string[]) => {
    try {
      const res = await createRoadmap({
        variables: { input: { title: finalTopic } },
      })
      const id = res.data?.createRoadmap.id
      if (!id) throw new Error("createRoadmap returned no id")
      // Kick off generation here, on the explicit user action — the mutation
      // returns immediately while the server streams nodes in the background.
      // The viewer then subscribes + polls to render them as they arrive.
      await generateRoadmapStream({
        variables: {
          roadmapId: id,
          topic: finalTopic,
          customizationAnswers: finalAnswers,
        },
      })
      navigate({
        to: "/roadmaps/$id",
        params: { id: String(id) },
        search: { topic: finalTopic },
      })
    } catch (e) {
      console.error(e)
      toast.error("Couldn't start roadmap generation. Please try again.")
    }
  }

  const allAnswered = questions.every((_, i) => answers[i])

  const handleGenerate = () => {
    const ordered = questions.map((q, i) => `${q.question}: ${answers[i]}`)
    void startGeneration(topic.trim(), ordered)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl py-8">
        {step === "topic" ? (
          <Card>
            <CardHeader>
              <CardTitle>Create a roadmap</CardTitle>
              <CardDescription>
                Tell us what you want to learn and we'll generate a personalized
                path.
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
            <CardFooter className="justify-end">
              <Button
                onClick={handleTopicSubmit}
                disabled={!topic.trim() || loadingQuestions}
              >
                {loadingQuestions ? (
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
                  <p className="font-medium text-sm">{q.question}</p>
                  <ToggleGroup
                    className="flex-wrap justify-start"
                    value={answers[i] ? [answers[i]] : []}
                    onValueChange={(v: string[]) =>
                      setAnswers((prev) => ({ ...prev, [i]: v[0] ?? "" }))
                    }
                  >
                    {q.choices.map((choice) => (
                      <ToggleGroupItem key={choice} value={choice}>
                        {choice}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={() => setStep("topic")}>
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={!allAnswered || creating}>
                {creating ? (
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
    </AppShell>
  )
}
