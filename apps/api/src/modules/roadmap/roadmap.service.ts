import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { RoadmapRepository } from './roadmap.repository';
import { CreateRoadmapInput } from './dto/create-roadmap.input';
import { UpdateRoadmapInput } from './dto/update-roadmap.input';
import { RoadmapType, DeleteRoadmapResult } from './types/roadmap.types';
import { RoadmapRow } from './roadmap.schema';
import { genericFetch } from '@/utils/fetch';

type RoadmapCustomizationResponse = {
  signal?: string;
  message?: string;
  questions?: RoadmapCustomizationQuestion[];
};

type RoadmapCustomizationQuestion = {
  question: string;
  choices: string[];
};

@Injectable()
export class RoadmapService {
  constructor(private readonly roadmapRepository: RoadmapRepository) {}

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

  async findAll(): Promise<RoadmapType[]> {
    const rows = await this.roadmapRepository.findAll();
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: number): Promise<RoadmapType> {
    const row = await this.findOneOrFail(id);
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

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/nlp/roadmap-customization`;
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

  async create(input: CreateRoadmapInput): Promise<RoadmapType> {
    const inserted = await this.roadmapRepository.create({
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      learningProfileId: input.learningProfileId ?? null,
      isPublished: input.isPublished ?? false,
    });

    return this.mapRow(inserted);
  }

  async update(input: UpdateRoadmapInput): Promise<RoadmapType> {
    await this.findOneOrFail(input.id);

    const updated = await this.roadmapRepository.update(input.id, {
      title: input.title,
      description: input.description,
      learningProfileId: input.learningProfileId,
      isPublished: input.isPublished,
    });

    return this.mapRow(updated);
  }

  async delete(id: number): Promise<DeleteRoadmapResult> {
    await this.findOneOrFail(id);

    await this.roadmapRepository.delete(id);

    return {
      success: true,
      message: `Roadmap ${id} has been deleted successfully`,
    };
  }

  async togglePublish(id: number): Promise<RoadmapType> {
    const existing = await this.findOneOrFail(id);

    const updated = await this.roadmapRepository.update(id, {
      isPublished: !existing.isPublished,
    });

    return this.mapRow(updated);
  }
}
