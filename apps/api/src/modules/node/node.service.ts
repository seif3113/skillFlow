import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { NodeRepository } from './node.repository';
import { RoadmapRepository } from '../roadmap/roadmap.repository';
import { NodeRow } from './node.schema';
import {
  NodeType,
  DeleteNodeResult,
  VectorDbSearchResponse,
} from './types/node.types';
import { CreateNodeInput } from './dto/create-node.input';
import { UpdateNodeInput } from './dto/update-node.input';
import { genericFetch } from '@/utils/fetch';

@Injectable()
export class NodeService {
  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly roadmapRepository: RoadmapRepository,
  ) {}

  private mapRow(row: NodeRow): NodeType {
    return {
      id: row.id,
      roadmapId: row.roadmapId,
      title: row.title,
      description: row.description ?? null,
      tags: row.tags ?? [],
      resources: row.resources ?? [],
      isCompleted: row.isCompleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async findNodeOrFail(id: number): Promise<NodeRow> {
    const row = await this.nodeRepository.findById(id);
    if (!row) {
      throw new NotFoundException(`Node with id ${id} not found`);
    }
    return row;
  }

  async findById(id: number): Promise<NodeType> {
    const row = await this.findNodeOrFail(id);
    return this.mapRow(row);
  }

  async findByRoadmapId(roadmapId: number): Promise<NodeType[]> {
    const roadmap = await this.roadmapRepository.findById(roadmapId);
    if (!roadmap) {
      throw new NotFoundException(`Roadmap with id ${roadmapId} not found`);
    }

    const rows = await this.nodeRepository.findByRoadmapId(roadmapId);
    return rows.map((r) => this.mapRow(r));
  }

  async findResources(
    topic: string,
    limit = 5,
    type?: string,
  ): Promise<VectorDbSearchResponse['results']> {
    const reqBody = {
      topic: topic.trim().toLowerCase(),
      limit,
      type,
    };

    console.log(
      `Searching resources with topic: "${topic}", limit: ${limit}, type: ${type}`,
    );

    const baseUrl = process.env.RAG_URI;
    if (!baseUrl) {
      throw new InternalServerErrorException('RAG_URI is not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/nlp/index/search`;
    const parsed = await genericFetch<VectorDbSearchResponse>(url, {
      method: 'POST',
      body: JSON.stringify(reqBody),
      timeout: 5000,
    });

    return parsed.results;
  }

  async create(input: CreateNodeInput): Promise<NodeType> {
    const roadmap = await this.roadmapRepository.findById(input.roadmapId);
    if (!roadmap) {
      throw new NotFoundException(
        `Roadmap with id ${input.roadmapId} not found — cannot create node`,
      );
    }

    const inserted = await this.nodeRepository.create({
      roadmapId: input.roadmapId,
      title: input.title,
      description: input.description ?? null,
      tags: input.tags ?? [],
      resources: input.resources ?? [],
      isCompleted: input.isCompleted ?? false,
    });

    return this.mapRow(inserted);
  }

  async update(input: UpdateNodeInput): Promise<NodeType> {
    await this.findNodeOrFail(input.id);

    const updated = await this.nodeRepository.update(input.id, {
      title: input.title,
      description: input.description,
      tags: input.tags,
      resources: input.resources,
      isCompleted: input.isCompleted,
    });

    return this.mapRow(updated);
  }

  async delete(id: number): Promise<DeleteNodeResult> {
    await this.findNodeOrFail(id);
    await this.nodeRepository.delete(id);

    return {
      success: true,
      message: `Node ${id} has been deleted successfully`,
    };
  }
}
