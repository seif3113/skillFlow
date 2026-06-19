import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { NodeService } from './node.service';
import { type CreateNodeInput } from './dto/create-node.input';
import { type UpdateNodeInput } from './dto/update-node.input';

@Resolver('Node')
export class NodeResolver {
  constructor(private readonly nodeService: NodeService) {}

  @Query('node')
  async getNode(@Args('id') id: number, @Session() session: UserSession) {
    const node = await this.nodeService.findById(id);
    await this.nodeService.assertRoadmapReadable(
      node.roadmapId,
      Number(session.user.id),
    );
    return node;
  }

  @Query('nodesByRoadmap')
  async getNodesByRoadmap(
    @Args('roadmapId') roadmapId: number,
    @Session() session: UserSession,
  ) {
    await this.nodeService.assertRoadmapReadable(
      roadmapId,
      Number(session.user.id),
    );
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
  async createNode(
    @Args('input') input: CreateNodeInput,
    @Session() session: UserSession,
  ) {
    await this.nodeService.assertRoadmapOwner(
      input.roadmapId,
      Number(session.user.id),
    );
    return this.nodeService.create(input);
  }

  @Mutation('updateNode')
  async updateNode(
    @Args('input') input: UpdateNodeInput,
    @Session() session: UserSession,
  ) {
    const node = await this.nodeService.findById(input.id);
    await this.nodeService.assertRoadmapOwner(
      node.roadmapId,
      Number(session.user.id),
    );
    return this.nodeService.update(input);
  }

  @Mutation('deleteNode')
  async deleteNode(@Args('id') id: number, @Session() session: UserSession) {
    const node = await this.nodeService.findById(id);
    await this.nodeService.assertRoadmapOwner(
      node.roadmapId,
      Number(session.user.id),
    );
    return this.nodeService.delete(id);
  }

  @Query('nodeChats')
  nodeChats(@Args('nodeId') nodeId: number, @Session() session: UserSession) {
    // Scoped to the authenticated user; the client-supplied userId is ignored.
    return this.nodeService.findChats(nodeId, Number(session.user.id));
  }

  @Mutation('sendNodeChatMessage')
  sendNodeChatMessage(
    @Args('nodeId') nodeId: number,
    @Args('sender') sender: 'user' | 'ai',
    @Args('message') message: any,
    @Session() session: UserSession,
  ) {
    return this.nodeService.sendChatMessage(
      nodeId,
      Number(session.user.id),
      sender,
      message,
    );
  }

  @Mutation('createNodeEdge')
  async createNodeEdge(
    @Args('roadmapId') roadmapId: number,
    @Args('sourceNodeId') sourceNodeId: number,
    @Args('targetNodeId') targetNodeId: number,
    @Session() session: UserSession,
  ) {
    await this.nodeService.assertRoadmapOwner(
      roadmapId,
      Number(session.user.id),
    );
    return this.nodeService.createEdge(roadmapId, sourceNodeId, targetNodeId);
  }

  @Mutation('deleteNodeEdge')
  deleteNodeEdge(@Args('id') id: number, @Session() session: UserSession) {
    return this.nodeService.deleteEdge(id, Number(session.user.id));
  }
}
