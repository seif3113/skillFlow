import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { NodeService } from './node.service';
import { type CreateNodeInput } from './dto/create-node.input';
import { type UpdateNodeInput } from './dto/update-node.input';

@Resolver('Node')
export class NodeResolver {
  constructor(private readonly nodeService: NodeService) {}

  @Query('node')
  getNode(@Args('id') id: number) {
    return this.nodeService.findById(id);
  }

  @Query('nodesByRoadmap')
  getNodesByRoadmap(@Args('roadmapId') roadmapId: number) {
    return this.nodeService.findByRoadmapId(roadmapId);
  }

  @Query('searchNodeResources')
  searchResources(
    @Args('topic') topic: string,
    @Args('limit', { defaultValue: 5 }) limit?: number,
    @Args('type', { nullable: true }) type?: string,
  ) {
    return this.nodeService.findResources(topic, limit, type);
  }

  @Mutation('createNode')
  createNode(@Args('input') input: CreateNodeInput) {
    return this.nodeService.create(input);
  }

  @Mutation('updateNode')
  updateNode(@Args('input') input: UpdateNodeInput) {
    return this.nodeService.update(input);
  }

  @Mutation('deleteNode')
  deleteNode(@Args('id') id: number) {
    return this.nodeService.delete(id);
  }
}
