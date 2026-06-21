import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';

import * as databaseProvider from '../../database/database.provider';
import {
  nodes,
  nodeEdges,
  nodeExplanationChats,
  NodeRow,
  NewNodeRow,
  NodeEdgeRow,
  NewNodeEdgeRow,
} from './node.schema';

export type CreateNodeData = Omit<NewNodeRow, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateNodeData = Partial<
  Pick<NodeRow, 'title' | 'description' | 'tags' | 'resources' | 'isCompleted'>
>;

@Injectable()
export class NodeRepository {
  constructor(
    @Inject(databaseProvider.DATABASE_CLIENT)
    private readonly db: databaseProvider.DrizzleDB,
  ) {}

  async findById(id: number): Promise<NodeRow | null> {
    const [row] = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByRoadmapId(roadmapId: number): Promise<NodeRow[]> {
    return this.db.select().from(nodes).where(eq(nodes.roadmapId, roadmapId));
  }

  async create(data: CreateNodeData): Promise<NodeRow> {
    const [inserted] = await this.db.insert(nodes).values(data).returning();

    return inserted;
  }

  async update(id: number, data: UpdateNodeData): Promise<NodeRow> {
    const patch: Partial<typeof nodes.$inferInsert> = {};

    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.resources !== undefined) patch.resources = data.resources;
    if (data.isCompleted !== undefined) patch.isCompleted = data.isCompleted;

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

  // --- DAG edges -------------------------------------------------------

  async findEdgesByRoadmapId(roadmapId: number): Promise<NodeEdgeRow[]> {
    return this.db
      .select()
      .from(nodeEdges)
      .where(eq(nodeEdges.roadmapId, roadmapId));
  }

  async findEdgeById(id: number): Promise<NodeEdgeRow | null> {
    const [row] = await this.db
      .select()
      .from(nodeEdges)
      .where(eq(nodeEdges.id, id))
      .limit(1);
    return row ?? null;
  }

  // Idempotent: a duplicate (roadmapId, source, target) returns the existing edge.
  async createEdge(
    data: Omit<NewNodeEdgeRow, 'id' | 'createdAt'>,
  ): Promise<NodeEdgeRow> {
    const [inserted] = await this.db
      .insert(nodeEdges)
      .values(data)
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted;

    // onConflictDoNothing silently drops duplicates — fetch the pre-existing row.
    // Match on all three constraint columns (roadmapId + source + target) so we
    // never accidentally return an edge from a different roadmap.
    const [existing] = await this.db
      .select()
      .from(nodeEdges)
      .where(
        and(
          eq(nodeEdges.roadmapId, data.roadmapId),
          eq(nodeEdges.sourceNodeId, data.sourceNodeId),
          eq(nodeEdges.targetNodeId, data.targetNodeId),
        ),
      )
      .limit(1);

    if (!existing) {
      // Should never happen: insert failed but no matching row exists.
      throw new Error(
        `createEdge: conflict but no existing edge found for ` +
          `roadmap=${data.roadmapId} source=${data.sourceNodeId} target=${data.targetNodeId}`,
      );
    }

    return existing;
  }

  async deleteEdge(id: number): Promise<void> {
    await this.db.delete(nodeEdges).where(eq(nodeEdges.id, id));
  }

  async findChats(nodeId: number, userId: number) {
    return this.db
      .select()
      .from(nodeExplanationChats)
      .where(
        and(
          eq(nodeExplanationChats.nodeId, nodeId),
          eq(nodeExplanationChats.userId, userId),
        ),
      )
      .orderBy(asc(nodeExplanationChats.sentAt));
  }

  async createChat(data: {
    nodeId: number;
    userId: number;
    sender: 'user' | 'ai';
    message: any;
  }) {
    const [inserted] = await this.db
      .insert(nodeExplanationChats)
      .values(data)
      .returning();
    return inserted;
  }
}
