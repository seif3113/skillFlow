import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { genericFetch } from '../../utils/fetch';
import { NodeRepository } from '../node/node.repository';
import { NodeService } from '../node/node.service';
import { RoadmapRepository } from '../roadmap/roadmap.repository';
import { QuizRepository, NewQuestionData } from './quiz.repository';
import { QuizRow, QuestionRow } from './quiz.schema';

const PASS_THRESHOLD = 70; // percent
const NUM_QUESTIONS = 5;
const NUM_REMEDIALS = 3;

type SafeQuiz = {
  id: number;
  nodeId: number;
  title: string;
  questions: { id: number; question: string; choices: string[] }[];
};

type QuizResult = {
  score: number;
  passed: boolean;
  passThreshold: number;
  results: {
    questionId: number;
    correct: boolean;
    correctAnswer: number;
    explanation: string | null;
  }[];
  nodeCompleted: boolean;
};

type RagQuizResponse = {
  signal?: string;
  questions?: {
    question?: string;
    choices?: unknown;
    answer?: number;
    explanation?: string;
  }[];
};

type RagRemedialResponse = {
  signal?: string;
  remedials?: { title?: string; description?: string }[];
};

@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly nodeRepository: NodeRepository,
    private readonly nodeService: NodeService,
    private readonly roadmapRepository: RoadmapRepository,
  ) {}

  // A node is locked until all of its prerequisites (incoming edges) are
  // completed — so a learner can't quiz a topic they haven't reached yet.
  private async assertNodeUnlocked(node: { id: number; roadmapId: number }) {
    const edges = await this.nodeRepository.findEdgesByRoadmapId(node.roadmapId);
    const prereqIds = edges
      .filter((e) => e.targetNodeId === node.id)
      .map((e) => e.sourceNodeId);
    if (prereqIds.length === 0) return;
    const nodes = await this.nodeRepository.findByRoadmapId(node.roadmapId);
    const completed = new Set(
      nodes.filter((n) => n.isCompleted).map((n) => n.id),
    );
    if (prereqIds.some((id) => !completed.has(id))) {
      throw new ForbiddenException(
        'Complete the prerequisite topics before taking this quiz',
      );
    }
  }

  // Quizzes live on a user's own roadmap nodes — every quiz op requires that
  // the caller owns the node's roadmap.
  private async assertNodeOwner(nodeId: number, userId: number) {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node with id ${nodeId} not found`);
    }
    const roadmap = await this.roadmapRepository.findById(node.roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new ForbiddenException(`You do not have access to node ${nodeId}`);
    }
    return node;
  }

  private toSafeQuiz(quiz: QuizRow, questions: QuestionRow[]): SafeQuiz {
    return {
      id: quiz.id,
      nodeId: quiz.nodeId,
      title: quiz.title,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        choices: q.choices ?? [],
      })),
    };
  }

  // All of the user's quiz attempts (newest first) for the progress page.
  findMyAttempts(userId: number) {
    return this.quizRepository.findAttemptsByUser(userId);
  }

  // Adaptive learning: from the questions the user missed on their latest
  // (failed) attempt, generate remedial sub-topics and insert them as
  // prerequisites of the failed node so the path self-heals around weak spots.
  async adaptNode(nodeId: number, userId: number) {
    const node = await this.assertNodeOwner(nodeId, userId);

    const quiz = await this.quizRepository.findByNodeId(nodeId);
    const attempt = await this.quizRepository.findLatestAttempt(nodeId, userId);
    if (!quiz || !attempt) {
      throw new BadRequestException('Take the quiz before adapting this topic');
    }
    if (attempt.passed) {
      throw new BadRequestException(
        'Your latest attempt passed — nothing to strengthen',
      );
    }

    const questions = await this.quizRepository.findQuestions(quiz.id);
    const missed = questions.flatMap((q, i) => {
      const choice = attempt.answers[i];
      if (choice === q.answer) return [];
      const choices = Array.isArray(q.choices) ? q.choices : [];
      return [
        {
          question: q.question,
          correct_choice: choices[q.answer] ?? '',
          user_choice: typeof choice === 'number' ? (choices[choice] ?? '') : '',
          explanation: q.explanation ?? '',
        },
      ];
    });
    if (missed.length === 0) return [];

    const remedials = await this.generateRemedialViaRag(
      node.title,
      node.description,
      missed,
    );

    const created = [];
    for (const r of remedials) {
      // Best-effort: attach learning resources for each remedial topic.
      let resources: Record<string, string>[] = [];
      try {
        const found = await this.nodeService.findResources(r.title, 3);
        resources = found.map(
          (x) => x.resource as unknown as Record<string, string>,
        );
      } catch {
        // Resources are optional — don't fail adaptation if search is down.
      }
      const row = await this.nodeRepository.create({
        roadmapId: node.roadmapId,
        title: r.title,
        description: r.description,
        tags: [],
        resources,
        isCompleted: false,
      });
      // The remedial node is a prerequisite of the failed node.
      await this.nodeRepository.createEdge({
        roadmapId: node.roadmapId,
        sourceNodeId: row.id,
        targetNodeId: nodeId,
      });
      created.push({
        id: row.id,
        roadmapId: row.roadmapId,
        title: row.title,
        description: row.description,
        tags: row.tags,
        resources: row.resources,
        isCompleted: row.isCompleted,
      });
    }
    return created;
  }

  private async generateRemedialViaRag(
    nodeTitle: string,
    nodeDescription: string | null,
    missed: {
      question: string;
      correct_choice: string;
      user_choice: string;
      explanation: string;
    }[],
  ): Promise<{ title: string; description: string | null }[]> {
    const baseUrl = process.env.RAG_URI;
    if (!baseUrl) {
      throw new InternalServerErrorException('RAG_URI is not configured');
    }
    const url = `${baseUrl.replace(/\/$/, '')}/nlp/generate-remedial`;
    const payload = await genericFetch<RagRemedialResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        node_name: nodeTitle,
        node_description: nodeDescription ?? '',
        missed_questions: missed,
        num_remedials: NUM_REMEDIALS,
      }),
      timeout: 30000,
    });
    const raw = Array.isArray(payload?.remedials) ? payload.remedials : [];
    return raw.flatMap((r) => {
      if (typeof r.title !== 'string' || !r.title.trim()) return [];
      return [
        {
          title: r.title.trim().slice(0, 255),
          description:
            typeof r.description === 'string'
              ? r.description.slice(0, 2000)
              : null,
        },
      ];
    });
  }

  async getNodeQuiz(nodeId: number, userId: number): Promise<SafeQuiz | null> {
    await this.assertNodeOwner(nodeId, userId);
    const quiz = await this.quizRepository.findByNodeId(nodeId);
    if (!quiz) return null;
    const questions = await this.quizRepository.findQuestions(quiz.id);
    return this.toSafeQuiz(quiz, questions);
  }

  async generateNodeQuiz(nodeId: number, userId: number): Promise<SafeQuiz> {
    const node = await this.assertNodeOwner(nodeId, userId);
    await this.assertNodeUnlocked(node);

    // Idempotent: don't regenerate if one already exists.
    const existing = await this.quizRepository.findByNodeId(nodeId);
    if (existing) {
      const questions = await this.quizRepository.findQuestions(existing.id);
      return this.toSafeQuiz(existing, questions);
    }

    const items = await this.generateQuestionsViaRag(
      node.title,
      node.description,
    );
    if (items.length === 0) {
      throw new InternalServerErrorException(
        'Quiz generation returned no questions',
      );
    }

    const quiz = await this.quizRepository.createWithQuestions(
      nodeId,
      node.title,
      items,
    );
    const questions = await this.quizRepository.findQuestions(quiz.id);
    return this.toSafeQuiz(quiz, questions);
  }

  async submitAttempt(
    nodeId: number,
    userId: number,
    answers: number[],
  ): Promise<QuizResult> {
    const node = await this.assertNodeOwner(nodeId, userId);
    await this.assertNodeUnlocked(node);

    const quiz = await this.quizRepository.findByNodeId(nodeId);
    if (!quiz) {
      throw new NotFoundException(`No quiz exists for node ${nodeId}`);
    }
    const questions = await this.quizRepository.findQuestions(quiz.id);
    if (answers.length !== questions.length) {
      throw new BadRequestException(
        `Expected ${questions.length} answers, received ${answers.length}`,
      );
    }

    const results = questions.map((q, i) => ({
      questionId: q.id,
      correct: answers[i] === q.answer,
      correctAnswer: q.answer,
      explanation: q.explanation ?? null,
    }));

    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= PASS_THRESHOLD;

    await this.quizRepository.createAttempt({
      quizId: quiz.id,
      userId,
      score,
      passed,
      answers,
    });

    // Hard gate: a passing attempt is the only way a node becomes complete.
    let nodeCompleted = false;
    if (passed) {
      await this.nodeRepository.update(nodeId, { isCompleted: true });
      nodeCompleted = true;
    }

    return {
      score,
      passed,
      passThreshold: PASS_THRESHOLD,
      results,
      nodeCompleted,
    };
  }

  private async generateQuestionsViaRag(
    nodeTitle: string,
    nodeDescription: string | null,
  ): Promise<NewQuestionData[]> {
    const baseUrl = process.env.RAG_URI;
    if (!baseUrl) {
      throw new InternalServerErrorException('RAG_URI is not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/nlp/generate-quiz`;
    const payload = await genericFetch<RagQuizResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        node_name: nodeTitle,
        node_description: nodeDescription ?? '',
        num_questions: NUM_QUESTIONS,
      }),
    });

    const raw = Array.isArray(payload?.questions) ? payload.questions : [];

    // Validate defensively: keep only well-formed MCQs with an in-range answer.
    return raw.flatMap((q): NewQuestionData[] => {
      const choices = Array.isArray(q.choices)
        ? q.choices.filter((c): c is string => typeof c === 'string')
        : [];
      const answer = typeof q.answer === 'number' ? q.answer : -1;
      if (
        typeof q.question !== 'string' ||
        choices.length < 2 ||
        answer < 0 ||
        answer >= choices.length
      ) {
        return [];
      }
      return [
        {
          question: q.question,
          choices,
          answer,
          explanation: typeof q.explanation === 'string' ? q.explanation : null,
        },
      ];
    });
  }
}
