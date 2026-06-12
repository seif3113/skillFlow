import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


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

// ─── Relations ────────────────────────────────────────────────────────────────

/**
 * Declares the one-to-many relationship: roadmap → roadmap_nodes.
 * The actual roadmap_nodes table is managed separately; we only declare
 * the relation here so Drizzle can handle relational queries when needed.
 */
export const roadmapsRelations = relations(roadmaps, ({ many }) => ({
  // nodes: many(roadmapNodes),  // Uncomment when roadmap_nodes module is added
}));


export type RoadmapRow = typeof roadmaps.$inferSelect;
export type NewRoadmapRow = typeof roadmaps.$inferInsert;
