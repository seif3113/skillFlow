import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from '../user/user.schema';
import { nodes } from '../node/node.schema';

export const roadmapLearningProfiles = pgTable('roadmap_learning_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  goal: varchar('goal', { length: 255 }),
  level: varchar('level', { length: 100 }),
  background: varchar('background', { length: 1000 }),
  timeAvailability: varchar('time_availability', { length: 255 }),
  preferences: jsonb('preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const senderEnum = pgEnum('sender_type', ['user', 'ai']);
export const intentEnum = pgEnum('edit_intent', [
  'add_node',
  'remove_node',
  'update_node',
  'general_edit',
]);

export const roadmaps = pgTable('roadmaps', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  learningProfileId: integer('learning_profile_id').references(
    () => roadmapLearningProfiles.id,
    { onDelete: 'set null' },
  ),
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

export const roadmapEditLogs = pgTable('roadmap_edit_logs', {
  id: serial('id').primaryKey(),
  roadmapId: integer('roadmap_id')
    .notNull()
    .references(() => roadmaps.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  intent: intentEnum('intent').notNull(),
  message: jsonb('message').notNull(),
  accept: boolean('accept').default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const roadmapLearningProfilesRelations = relations(
  roadmapLearningProfiles,
  ({ one, many }) => ({
    user: one(user, {
      fields: [roadmapLearningProfiles.userId],
      references: [user.id],
    }),
    roadmaps: many(roadmaps),
  }),
);

export const roadmapsRelations = relations(roadmaps, ({ one, many }) => ({
  user: one(user, { fields: [roadmaps.userId], references: [user.id] }),
  learningProfile: one(roadmapLearningProfiles, {
    fields: [roadmaps.learningProfileId],
    references: [roadmapLearningProfiles.id],
  }),
  nodes: many(nodes),
  editLogs: many(roadmapEditLogs),
}));

export const roadmapEditLogsRelations = relations(
  roadmapEditLogs,
  ({ one }) => ({
    roadmap: one(roadmaps, {
      fields: [roadmapEditLogs.roadmapId],
      references: [roadmaps.id],
    }),
  }),
);

// Types
export type RoadmapRow = typeof roadmaps.$inferSelect;
export type NewRoadmapRow = typeof roadmaps.$inferInsert;
