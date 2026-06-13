import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roadmaps } from '../roadmap/roadmap.schema';

export const nodes = pgTable('nodes', {
  id: serial('id').primaryKey(),
  roadmapId: integer('roadmap_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 2000 }),
  tags: jsonb('tags').$type<string[]>(),
  resources: jsonb('resources').$type<Record<string, string>[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


export const nodesRelations = relations(nodes, ({ one }) => ({
  roadmap: one(roadmaps, {
    fields: [nodes.roadmapId],
    references: [roadmaps.id],
  }),
}));


export type NodeRow = typeof nodes.$inferSelect;
export type NewNodeRow = typeof nodes.$inferInsert;
