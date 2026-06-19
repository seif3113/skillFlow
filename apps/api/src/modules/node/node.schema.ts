import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  boolean,
  unique,
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
  // Display/ordering index within a roadmap (kept in sync with the live DB).
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Prerequisite edges between nodes within a roadmap, forming the DAG.
// An edge source -> target means "source is a prerequisite of target".
export const nodeEdges = pgTable(
  'node_edges',
  {
    id: serial('id').primaryKey(),
    roadmapId: integer('roadmap_id')
      .notNull()
      .references(() => roadmaps.id, { onDelete: 'cascade' }),
    sourceNodeId: integer('source_node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    targetNodeId: integer('target_node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('node_edges_source_target_unique').on(
      t.sourceNodeId,
      t.targetNodeId,
    ),
  ],
);

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

export const nodeEdgesRelations = relations(nodeEdges, ({ one }) => ({
  roadmap: one(roadmaps, {
    fields: [nodeEdges.roadmapId],
    references: [roadmaps.id],
  }),
  source: one(nodes, {
    fields: [nodeEdges.sourceNodeId],
    references: [nodes.id],
    relationName: 'edgeSource',
  }),
  target: one(nodes, {
    fields: [nodeEdges.targetNodeId],
    references: [nodes.id],
    relationName: 'edgeTarget',
  }),
}));

// Types
export type NodeRow = typeof nodes.$inferSelect;
export type NewNodeRow = typeof nodes.$inferInsert;
export type NodeEdgeRow = typeof nodeEdges.$inferSelect;
export type NewNodeEdgeRow = typeof nodeEdges.$inferInsert;
