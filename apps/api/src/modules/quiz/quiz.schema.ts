import { pgTable, serial, integer, varchar, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nodes } from '../node/node.schema';

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

// Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  node: one(nodes, {
    fields: [quizzes.nodeId],
    references: [nodes.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
}));
