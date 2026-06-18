import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import * as databaseProvider from '../../database/database.provider';
import { roadmaps, NewRoadmapRow, RoadmapRow } from './roadmap.schema';

export type CreateRoadmapData = Omit<
  NewRoadmapRow,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateRoadmapData = Partial<
  Pick<
    RoadmapRow,
    'title' | 'description' | 'learningProfileId' | 'isPublished'
  >
>;

@Injectable()
export class RoadmapRepository {
  constructor(
    @Inject(databaseProvider.DATABASE_CLIENT)
    private readonly db: databaseProvider.DrizzleDB,
  ) {}

  async findAll(): Promise<RoadmapRow[]> {
    return this.db.select().from(roadmaps);
  }

  async findById(id: number): Promise<RoadmapRow | null> {
    const [row] = await this.db
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByUserId(userId: number): Promise<RoadmapRow[]> {
    return this.db.select().from(roadmaps).where(eq(roadmaps.userId, userId));
  }

  async findByLearningProfileId(
    learningProfileId: number,
  ): Promise<RoadmapRow[]> {
    return this.db
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.learningProfileId, learningProfileId));
  }

  async create(data: CreateRoadmapData): Promise<RoadmapRow> {
    const now = new Date();

    const [inserted] = await this.db
      .insert(roadmaps)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted;
  }

  async update(id: number, data: UpdateRoadmapData): Promise<RoadmapRow> {
    const [updated] = await this.db
      .update(roadmaps)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(roadmaps.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(roadmaps).where(eq(roadmaps.id, id));
  }
}
