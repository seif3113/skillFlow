import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { RoadmapService } from './roadmap.service';
import { type CreateRoadmapInput } from './dto/create-roadmap.input';
import { type UpdateRoadmapInput } from './dto/update-roadmap.input';
import { NodeService } from '../node/node.service';
import { type PublicRoadmap } from '../../graphql';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { type RoadmapType } from './types/roadmap.types';

@Resolver('Roadmap')
export class RoadmapResolver {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly nodeService: NodeService,
  ) {}

  @ResolveField('nodes')
  resolveNodes(@Parent() roadmap: RoadmapType) {
    return this.nodeService.findByRoadmapId(roadmap.id);
  }

  @Query('roadmaps')
  getRoadmaps() {
    return this.roadmapService.findAll();
  }

  @Query('roadmap')
  getRoadmap(@Args('id') id: number) {
    return this.roadmapService.findById(id);
  }

  @Query('roadmapsByUser')
  getRoadmapsByUser(@Args('userId') userId: number) {
    return this.roadmapService.findByUserId(userId);
  }

  @Query('roadmapsByLearningProfile')
  getRoadmapsByLearningProfile(
    @Args('learningProfileId') learningProfileId: number,
  ) {
    return this.roadmapService.findByLearningProfile(learningProfileId);
  }

  @Query('roadmapCustomizationQuestions')
  getRoadmapCustomizationQuestions(@Args('message') message: string) {
    return this.roadmapService.getCustomizationQuestions(message);
  }

  @Mutation('createRoadmap')
  createRoadmap(@Args('input') input: CreateRoadmapInput) {
    return this.roadmapService.create(input);
  }

  @Mutation('updateRoadmap')
  updateRoadmap(@Args('input') input: UpdateRoadmapInput) {
    return this.roadmapService.update(input);
  }

  @Mutation('updateRoadmapAi')
  updateRoadmapAi(@Args('id') id: number, @Args('message') message: string) {
    return this.roadmapService.updateRoadmapAi(id, message);
  }

  @Mutation('deleteRoadmap')
  deleteRoadmap(@Args('id') id: number) {
    return this.roadmapService.delete(id);
  }

  @Mutation('publishRoadmap')
  publishRoadmap(@Args('id') id: number) {
    return this.roadmapService.togglePublish(id);
  }

  @Mutation('forkRoadmap')
  async forkRoadmap(@Args('id') id: number, @Args('userId') userId: number) {
    const original = await this.roadmapService.findById(id);
    const forked = await this.roadmapService.create({
      userId,
      title: `${original.title} (Forked)`,
      description: original.description ?? undefined,
      isPublished: false,
    });

    const originalNodes = await this.nodeService.findByRoadmapId(id);
    for (const node of originalNodes) {
      await this.nodeService.create({
        roadmapId: forked.id,
        title: node.title,
        description: node.description ?? undefined,
        tags: node.tags ?? undefined,
        resources: node.resources ?? undefined,
        isCompleted: false,
      });
    }

    return forked;
  }
}

@AllowAnonymous()
@Resolver('PublicRoadmap')
export class PublicRoadmapResolver {
  constructor(
    private readonly nodeService: NodeService,
    private readonly roadmapService: RoadmapService,
  ) {}

  @ResolveField('nodes')
  resolveNodes(@Parent() roadmap: PublicRoadmap) {
    return this.nodeService.findByRoadmapId(roadmap.id);
  }

  @Query('publicRoadmaps')
  getPublicRoadmaps() {
    return this.roadmapService.findAllPublic();
  }

  @Query('publicRoadmap')
  getPublicRoadmap(@Args('id') id: number) {
    return this.roadmapService.findById(id);
  }
}
