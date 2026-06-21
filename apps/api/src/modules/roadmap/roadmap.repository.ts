import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import * as databaseProvider from '../../database/database.provider';
import { roadmaps, NewRoadmapRow, RoadmapRow } from './roadmap.schema';
import { user } from '../user/user.schema';
import { PublicRoadmap } from '../../graphql';

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
    return this.db.select().from(roadmaps).orderBy(roadmaps.id);
  }

  async findAllPublic(): Promise<PublicRoadmap[]> {
    return this.db
      .select({
        id: roadmaps.id,
        userName: user.name,
        userImage: user.image,
        title: roadmaps.title,
        description: roadmaps.description,
        isPublished: roadmaps.isPublished,
        createdAt: roadmaps.createdAt,
        updatedAt: roadmaps.updatedAt,
      })
      .from(roadmaps)
      .innerJoin(user, eq(roadmaps.userId, user.id))
      .where(eq(roadmaps.isPublished, true));
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
