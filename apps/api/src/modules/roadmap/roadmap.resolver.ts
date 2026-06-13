import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql';
import { RoadmapService } from './roadmap.service';
import { RoadmapType, DeleteRoadmapResult } from './types/roadmap.types';
import { CreateRoadmapInput } from './dto/create-roadmap.input';
import { UpdateRoadmapInput } from './dto/update-roadmap.input';
import { NodeService } from '../node/node.service';
import { NodeType } from '../node/types/node.types';

@Resolver(() => RoadmapType)
export class RoadmapResolver {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly nodeService: NodeService,
  ) { }

  @ResolveField('nodes', () => [NodeType], { nullable: true })
  resolveNodes(@Parent() roadmap: RoadmapType): Promise<NodeType[]> {
    return this.nodeService.findByRoadmapId(roadmap.id);
  }


  @Query(() => [RoadmapType], {
    name: 'roadmaps',
    description: 'Get all roadmaps.',
  })
  getRoadmaps(): Promise<RoadmapType[]> {
    return this.roadmapService.findAll();
  }

  @Query(() => RoadmapType, {
    name: 'roadmap',
    description: 'Get a single roadmap by id.',
  })
  getRoadmap(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<RoadmapType> {
    return this.roadmapService.findById(id);
  }

  @Query(() => [RoadmapType], {
    name: 'roadmapsByUser',
    description: 'Get all roadmaps for a specific user.',
  })
  getRoadmapsByUser(
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<RoadmapType[]> {
    return this.roadmapService.findByUserId(userId);
  }

  @Query(() => [RoadmapType], {
    name: 'roadmapsByLearningProfile',
    description: 'Get roadmaps filtered by a specific learning profile.',
  })
  getRoadmapsByLearningProfile(
    @Args('learningProfileId', { type: () => Int }) learningProfileId: number,
  ): Promise<RoadmapType[]> {
    return this.roadmapService.findByLearningProfile(learningProfileId);
  }

  @Mutation(() => RoadmapType, {
    description: 'Create a new roadmap.',
  })
  createRoadmap(
    @Args('input') input: CreateRoadmapInput,
  ): Promise<RoadmapType> {
    return this.roadmapService.create(input);
  }

  @Mutation(() => RoadmapType, {
    description: 'Update a roadmap.',
  })
  updateRoadmap(
    @Args('input') input: UpdateRoadmapInput,
  ): Promise<RoadmapType> {
    return this.roadmapService.update(input);
  }

  @Mutation(() => DeleteRoadmapResult, {
    description: 'Delete a roadmap by id.',
  })
  deleteRoadmap(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DeleteRoadmapResult> {
    return this.roadmapService.delete(id);
  }

  @Mutation(() => RoadmapType, {
    description: 'Toggle the published state of a roadmap.',
  })
  publishRoadmap(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<RoadmapType> {
    return this.roadmapService.togglePublish(id);
  }
}
