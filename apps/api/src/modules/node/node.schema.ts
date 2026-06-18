import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roadmaps } from '../roadmap/roadmap.schema';
import { user } from '../user/user.schema';
import { quizzes } from '../quiz/quiz.schema';

const senderEnum = pgEnum('sender_type', ['user', 'ai']);

export const nodes = pgTable('nodes', {
  id: serial('id').primaryKey(),
  roadmapId: integer('roadmap_id')
    .notNull()
    .references(() => roadmaps.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 2000 }),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  resources: jsonb('resources')
    .$type<Record<string, string>[]>()
    .default([])
    .notNull(),
  quizId: integer('quiz_id'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const nodeExplanationChats = pgTable('node_explanation_chats', {
  id: serial('id').primaryKey(),
  nodeId: integer('node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  message: jsonb('message').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const nodesRelations = relations(nodes, ({ one, many }) => ({
  roadmap: one(roadmaps, {
    fields: [nodes.roadmapId],
    references: [roadmaps.id],
  }),
  quiz: one(quizzes, {
    fields: [nodes.id],
    references: [quizzes.nodeId],
  }),
  chats: many(nodeExplanationChats),
}));

export const nodeExplanationChatsRelations = relations(
  nodeExplanationChats,
  ({ one }) => ({
    node: one(nodes, {
      fields: [nodeExplanationChats.nodeId],
      references: [nodes.id],
    }),
    user: one(user, {
      fields: [nodeExplanationChats.userId],
      references: [user.id],
    }),
  }),
);

// Types
export type NodeRow = typeof nodes.$inferSelect;
export type NewNodeRow = typeof nodes.$inferInsert;
