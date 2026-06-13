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

@Resolver('Roadmap')
export class RoadmapResolver {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly nodeService: NodeService,
  ) {}

  @ResolveField('nodes')
  resolveNodes(@Parent() roadmap: any) {
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

  @Mutation('createRoadmap')
  createRoadmap(@Args('input') input: CreateRoadmapInput) {
    return this.roadmapService.create(input);
  }

  @Mutation('updateRoadmap')
  updateRoadmap(@Args('input') input: UpdateRoadmapInput) {
    return this.roadmapService.update(input);
  }

  @Mutation('deleteRoadmap')
  deleteRoadmap(@Args('id') id: number) {
    return this.roadmapService.delete(id);
  }

  @Mutation('publishRoadmap')
  publishRoadmap(@Args('id') id: number) {
    return this.roadmapService.togglePublish(id);
  }
}
