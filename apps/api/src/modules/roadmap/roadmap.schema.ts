import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nodes } from '../node/node.schema';



export const roadmaps = pgTable('roadmaps', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  learningProfileId: integer('learning_profile_id'),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roadmapsRelations = relations(roadmaps, ({ many }) => ({
  nodes: many(nodes),
}));


export type RoadmapRow = typeof roadmaps.$inferSelect;
export type NewRoadmapRow = typeof roadmaps.$inferInsert;
