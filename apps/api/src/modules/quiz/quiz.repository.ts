import { Injectable, Inject } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';

import * as databaseProvider from '../../database/database.provider';
import {
  quizzes,
  questions,
  quizAttempts,
  QuizRow,
  QuestionRow,
  QuizAttemptRow,
} from './quiz.schema';

export type NewQuestionData = {
  question: string;
  choices: string[];
  answer: number;
  explanation: string | null;
};

@Injectable()
export class QuizRepository {
  constructor(
    @Inject(databaseProvider.DATABASE_CLIENT)
    private readonly db: databaseProvider.DrizzleDB,
  ) {}

  async findByNodeId(nodeId: number): Promise<QuizRow | null> {
    const [row] = await this.db
      .select()
      .from(quizzes)
      .where(eq(quizzes.nodeId, nodeId))
      .limit(1);
    return row ?? null;
  }

  async findQuestions(quizId: number): Promise<QuestionRow[]> {
    return this.db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(asc(questions.id));
  }

  // Atomically create the quiz and its questions so we never persist a quiz
  // with no questions.
  async createWithQuestions(
    nodeId: number,
    title: string,
    items: NewQuestionData[],
  ): Promise<QuizRow> {
    return this.db.transaction(async (tx) => {
      const [quiz] = await tx
        .insert(quizzes)
        .values({ nodeId, title })
        .returning();
      if (items.length > 0) {
        await tx
          .insert(questions)
          .values(items.map((q) => ({ quizId: quiz.id, ...q })));
      }
      return quiz;
    });
  }

  async createAttempt(data: {
    quizId: number;
    userId: number;
    score: number;
    passed: boolean;
    answers: number[];
  }): Promise<QuizAttemptRow> {
    const [row] = await this.db.insert(quizAttempts).values(data).returning();
    return row;
  }
}
