import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { genericFetch } from '@/utils/fetch';
import { NodeRepository } from '../node/node.repository';
import { RoadmapRepository } from '../roadmap/roadmap.repository';
import { QuizRepository, NewQuestionData } from './quiz.repository';
import { QuizRow, QuestionRow } from './quiz.schema';

const PASS_THRESHOLD = 70; // percent
const NUM_QUESTIONS = 5;

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

@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly nodeRepository: NodeRepository,
    private readonly roadmapRepository: RoadmapRepository,
  ) {}

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

  async getNodeQuiz(nodeId: number, userId: number): Promise<SafeQuiz | null> {
    await this.assertNodeOwner(nodeId, userId);
    const quiz = await this.quizRepository.findByNodeId(nodeId);
    if (!quiz) return null;
    const questions = await this.quizRepository.findQuestions(quiz.id);
    return this.toSafeQuiz(quiz, questions);
  }

  async generateNodeQuiz(nodeId: number, userId: number): Promise<SafeQuiz> {
    const node = await this.assertNodeOwner(nodeId, userId);

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
    await this.assertNodeOwner(nodeId, userId);

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
