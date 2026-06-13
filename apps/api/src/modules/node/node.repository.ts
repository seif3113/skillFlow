import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import * as databaseProvider from '../../database/database.provider';
import { nodes, NodeRow, NewNodeRow } from './node.schema';

export type CreateNodeData = Omit<NewNodeRow, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateNodeData = Partial<
  Pick<NodeRow, 'title' | 'description' | 'tags' | 'resources'>
>;

@Injectable()
export class NodeRepository {
  constructor(
    @Inject(databaseProvider.DATABASE_CLIENT)
    private readonly db: databaseProvider.DrizzleDB,
  ) { }


  async findById(id: number): Promise<NodeRow | null> {
    const [row] = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByRoadmapId(roadmapId: number): Promise<NodeRow[]> {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.roadmapId, roadmapId));
  }


  async create(data: CreateNodeData): Promise<NodeRow> {
    const now = new Date();

    const [inserted] = await this.db
      .insert(nodes)
      .values({
        roadmapId: data.roadmapId,
        title: data.title,
        description: data.description ?? null,
        tags: data.tags ?? null,
        resources: data.resources ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted;
  }

  async update(id: number, data: UpdateNodeData): Promise<NodeRow> {
    const patch: Partial<typeof nodes.$inferInsert> = {};

    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.resources !== undefined) patch.resources = data.resources;

    patch.updatedAt = new Date();

    const [updated] = await this.db
      .update(nodes)
      .set(patch)
      .where(eq(nodes.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(nodes).where(eq(nodes.id, id));
  }
}
