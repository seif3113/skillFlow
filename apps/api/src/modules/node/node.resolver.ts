import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { NodeService } from './node.service';
import { NodeType, DeleteNodeResult } from './types/node.types';
import { CreateNodeInput } from './dto/create-node.input';
import { UpdateNodeInput } from './dto/update-node.input';

@Resolver(() => NodeType)
export class NodeResolver {
  constructor(private readonly nodeService: NodeService) { }


  @Query(() => NodeType, {
    name: 'node',
    description: 'Get a single node by id.',
  })
  getNode(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<NodeType> {
    return this.nodeService.findById(id);
  }

  @Query(() => [NodeType], {
    name: 'nodesByRoadmap',
    description: 'Get all nodes belonging to a roadmap.',
  })
  getNodesByRoadmap(
    @Args('roadmapId', { type: () => Int }) roadmapId: number,
  ): Promise<NodeType[]> {
    return this.nodeService.findByRoadmapId(roadmapId);
  }


  @Mutation(() => NodeType, {
    description: 'Create a new node inside a roadmap.',
  })
  createNode(
    @Args('input') input: CreateNodeInput,
  ): Promise<NodeType> {
    return this.nodeService.create(input);
  }

  @Mutation(() => NodeType, {
    description: 'Update a node. Supports partial updates.',
  })
  updateNode(
    @Args('input') input: UpdateNodeInput,
  ): Promise<NodeType> {
    return this.nodeService.update(input);
  }

  @Mutation(() => DeleteNodeResult, {
    description: 'Delete a node by id.',
  })
  deleteNode(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DeleteNodeResult> {
    return this.nodeService.delete(id);
  }
}
