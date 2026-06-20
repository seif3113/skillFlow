import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nodes } from '../node/node.schema';
import { user } from '../user/user.schema';

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  nodeId: integer('node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  question: varchar('question', { length: 1000 }).notNull(),
  choices: jsonb('choices').$type<string[]>().notNull(),
  answer: integer('answer').notNull(),
  explanation: varchar('explanation', { length: 2000 }),
});

// A user's graded attempt at a quiz. A passing attempt is what completes the
// node (hard gate), and the history powers retakes / progress.
export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(), // 0–100
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').$type<number[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  node: one(nodes, {
    fields: [quizzes.nodeId],
    references: [nodes.id],
  }),
  questions: many(questions),
  attempts: many(quizAttempts),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  user: one(user, {
    fields: [quizAttempts.userId],
    references: [user.id],
  }),
}));

export type QuizRow = typeof quizzes.$inferSelect;
export type QuestionRow = typeof questions.$inferSelect;
export type QuizAttemptRow = typeof quizAttempts.$inferSelect;
