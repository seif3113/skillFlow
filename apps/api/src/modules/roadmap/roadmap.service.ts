import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { RoadmapRepository } from './roadmap.repository';
import { CreateRoadmapInput } from './dto/create-roadmap.input';
import { UpdateRoadmapInput } from './dto/update-roadmap.input';
import {
  RoadmapType,
  DeleteRoadmapResult,
  UpdatedRoadmapResult,
} from './types/roadmap.types';
import { RoadmapRow } from './roadmap.schema';
import { genericFetch } from '@/utils/fetch';
import { NodeRepository } from '../node/node.repository';
import { NodeService } from '../node/node.service';
import { NodeType } from '../node/types/node.types';

type RoadmapCustomizationResponse = {
  signal?: string;
  questions?: RoadmapCustomizationQuestion[];
};

type RoadmapCustomizationQuestion = {
  question: string;
  choices: string[];
};

@Injectable()
export class RoadmapService {
  constructor(
    private readonly roadmapRepository: RoadmapRepository,
    private readonly nodeService: NodeService,
  ) {}

  private mapRow(row: RoadmapRow): RoadmapType {
    return {
      id: row.id,
      userId: row.userId,
      learningProfileId: row.learningProfileId ?? null,
      title: row.title,
      description: row.description ?? null,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async findOneOrFail(id: number): Promise<RoadmapRow> {
    const row = await this.roadmapRepository.findById(id);

    if (!row) {
      throw new NotFoundException(`Roadmap with id ${id} not found`);
    }

    return row;
  }

  // Throws unless `userId` owns the roadmap; returns the row for reuse.
  async assertOwner(id: number, userId: number): Promise<RoadmapRow> {
    const row = await this.findOneOrFail(id);
    if (row.userId !== userId) {
      throw new ForbiddenException(`You do not have access to roadmap ${id}`);
    }
    return row;
  }

  // Read access: the owner, or anyone if the roadmap is published.
  async findByIdForUser(id: number, userId: number): Promise<RoadmapType> {
    const row = await this.findOneOrFail(id);
    if (!row.isPublished && row.userId !== userId) {
      throw new ForbiddenException(`You do not have access to roadmap ${id}`);
    }
    return this.mapRow(row);
  }

  async findAll(): Promise<RoadmapType[]> {
    const rows = await this.roadmapRepository.findAll();
    return rows.map((r) => this.mapRow(r));
  }

  async findAllPublic() {
    const rows = await this.roadmapRepository.findAllPublic();
    return rows;
  }

  async findById(id: number): Promise<RoadmapType> {
    const row = await this.findOneOrFail(id);
    return this.mapRow(row);
  }

  // Anonymous-safe read: only returns the roadmap when it's published, so an
  // unauthenticated caller can't fetch a private roadmap by guessing its id.
  async findPublicById(id: number): Promise<RoadmapType | null> {
    const row = await this.roadmapRepository.findById(id);
    if (!row || !row.isPublished) return null;
    return this.mapRow(row);
  }

  async findByUserId(userId: number): Promise<RoadmapType[]> {
    const rows = await this.roadmapRepository.findByUserId(userId);
    return rows.map((r) => this.mapRow(r));
  }

  async findByLearningProfile(
    learningProfileId: number,
  ): Promise<RoadmapType[]> {
    const rows =
      await this.roadmapRepository.findByLearningProfileId(learningProfileId);
    return rows.map((r) => this.mapRow(r));
  }

  async getCustomizationQuestions(
    message: string,
  ): Promise<RoadmapCustomizationQuestion[]> {
    const cleanedMessage = message.trim();

    if (!cleanedMessage) {
      throw new BadRequestException('message is required');
    }

    const baseUrl = process.env.RAG_URI;

    if (!baseUrl) {
      throw new InternalServerErrorException('RAG_URI is not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/nlp/roadmap-customization`;
    const payload = await genericFetch<RoadmapCustomizationResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ message: cleanedMessage }),
    });

    if (!Array.isArray(payload.questions)) {
      throw new InternalServerErrorException(
        'RAG service response did not include questions',
      );
    }

    return payload.questions;
  }

  async create(
    input: CreateRoadmapInput,
    userId: number,
  ): Promise<RoadmapType> {
    const inserted = await this.roadmapRepository.create({
      userId,
      title: input.title,
      description: input.description ?? null,
      learningProfileId: input.learningProfileId ?? null,
      isPublished: input.isPublished ?? false,
    });

    return this.mapRow(inserted);
  }

  async update(
    input: UpdateRoadmapInput,
    userId: number,
  ): Promise<RoadmapType> {
    await this.assertOwner(input.id, userId);

    const updated = await this.roadmapRepository.update(input.id, {
      title: input.title,
      description: input.description,
      learningProfileId: input.learningProfileId,
      isPublished: input.isPublished,
    });

    return this.mapRow(updated);
  }

  async updateRoadmapAi(
    id: number,
    message: string,
    userId: number,
  ): Promise<UpdatedRoadmapResult['roadmap']> {
    await this.assertOwner(id, userId);
    const cleanedMessage = message.trim();

    if (!cleanedMessage) {
      throw new BadRequestException('message is required');
    }

    const nodes = await this.nodeService.findByRoadmapId(id);
    const roadmapNodes = nodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      tags: node.tags,
      resources: node.resources,
    }));

    const baseUrl = process.env.RAG_URI;

    if (!baseUrl) {
      throw new InternalServerErrorException('RAG_URI is not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/nlp/edit-roadmap-rag`;
    const payload = await genericFetch<UpdatedRoadmapResult>(url, {
      method: 'POST',
      body: JSON.stringify({ prompt: cleanedMessage, roadmap: roadmapNodes }),
    });

    if (!payload || !payload.roadmap) {
      throw new InternalServerErrorException(
        'RAG service response did not include updated roadmap',
      );
    }

    return payload.roadmap;
  }

  async delete(id: number, userId: number): Promise<DeleteRoadmapResult> {
    await this.assertOwner(id, userId);

    await this.roadmapRepository.delete(id);

    return {
      success: true,
      message: `Roadmap ${id} has been deleted successfully`,
    };
  }

  async togglePublish(id: number, userId: number): Promise<RoadmapType> {
    const existing = await this.assertOwner(id, userId);

    const updated = await this.roadmapRepository.update(id, {
      isPublished: !existing.isPublished,
    });

    return this.mapRow(updated);
  }
}
