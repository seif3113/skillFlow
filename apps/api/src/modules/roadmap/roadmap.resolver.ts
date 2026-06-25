import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { RoadmapService } from './roadmap.service';
import { type CreateRoadmapInput } from './dto/create-roadmap.input';
import { type UpdateRoadmapInput } from './dto/update-roadmap.input';
import { NodeService } from '../node/node.service';
import { type PublicRoadmap } from '../../graphql';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { type RoadmapType } from './types/roadmap.types';

const pubSub = new PubSub();

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

  @ResolveField('edges')
  resolveEdges(@Parent() roadmap: RoadmapType) {
    return this.nodeService.findEdgesByRoadmapId(roadmap.id);
  }

  @Query('roadmaps')
  getRoadmaps(@Session() session: UserSession) {
    // Scope to the caller; never expose other users' roadmaps.
    return this.roadmapService.findByUserId(Number(session.user.id));
  }

  @Query('roadmap')
  getRoadmap(@Args('id') id: number, @Session() session: UserSession) {
    return this.roadmapService.findByIdForUser(id, Number(session.user.id));
  }

  @Query('roadmapsByUser')
  getRoadmapsByUser(@Session() session: UserSession) {
    // Always the authenticated user; the client-supplied id arg is ignored.
    return this.roadmapService.findByUserId(Number(session.user.id));
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
  createRoadmap(
    @Args('input') input: CreateRoadmapInput,
    @Session() session: UserSession,
  ) {
    return this.roadmapService.create(input, Number(session.user.id));
  }

  @Mutation('updateRoadmap')
  updateRoadmap(
    @Args('input') input: UpdateRoadmapInput,
    @Session() session: UserSession,
  ) {
    return this.roadmapService.update(input, Number(session.user.id));
  }

  @Mutation('updateRoadmapAi')
  updateRoadmapAi(
    @Args('id') id: number,
    @Args('message') message: string,
    @Session() session: UserSession,
  ) {
    return this.roadmapService.updateRoadmapAi(
      id,
      message,
      Number(session.user.id),
    );
  }

  @Mutation('deleteRoadmap')
  deleteRoadmap(@Args('id') id: number, @Session() session: UserSession) {
    return this.roadmapService.delete(id, Number(session.user.id));
  }

  @Mutation('publishRoadmap')
  publishRoadmap(@Args('id') id: number, @Session() session: UserSession) {
    return this.roadmapService.togglePublish(id, Number(session.user.id));
  }

  @Mutation('forkRoadmap')
  async forkRoadmap(@Args('id') id: number, @Session() session: UserSession) {
    const userId = Number(session.user.id);
    // Can only fork roadmaps you can read (your own or a published one).
    const original = await this.roadmapService.findByIdForUser(id, userId);
    const forked = await this.roadmapService.create(
      {
        userId,
        title: `${original.title} (Forked)`,
        description: original.description ?? undefined,
        isPublished: false,
      },
      userId,
    );

    // Copy nodes and build an oldId → newId map so we can re-wire edges.
    const originalNodes = await this.nodeService.findByRoadmapId(id);
    const oldToNewId = new Map<number, number>();

    for (const node of originalNodes) {
      const cloned = await this.nodeService.create({
        roadmapId: forked.id,
        title: node.title,
        description: node.description ?? undefined,
        tags: node.tags ?? undefined,
        resources: node.resources ?? undefined,
        isCompleted: false,
      });
      oldToNewId.set(node.id, cloned.id);
    }

    // Copy edges: translate every source/target to the new node IDs.
    const originalEdges = await this.nodeService.findEdgesByRoadmapId(id);
    for (const edge of originalEdges) {
      const newSource = oldToNewId.get(edge.sourceNodeId);
      const newTarget = oldToNewId.get(edge.targetNodeId);
      if (newSource && newTarget) {
        await this.nodeService.createEdge(forked.id, newSource, newTarget);
      }
    }

    return forked;
  }

  @AllowAnonymous()
  @Subscription('roadmapGenerationStream', {
    filter: (payload, variables) =>
      payload.roadmapGenerationStream.roadmapId === variables.roadmapId,
    resolve: (payload) => payload.roadmapGenerationStream.eventData,
  })
  roadmapGenerationStream(@Args('roadmapId') roadmapId: number) {
    return pubSub.asyncIterableIterator(`roadmapGenerationStream_${roadmapId}`);
  }

  @Mutation('generateRoadmapStream')
  async generateRoadmapStream(
    @Args('roadmapId') roadmapId: number,
    @Args('topic') topic: string,
    @Session() session: UserSession,
    @Args('customizationAnswers') customizationAnswers?: string[],
  ) {
    // Only the roadmap's owner may generate into it.
    await this.roadmapService.assertOwner(roadmapId, Number(session.user.id));
    const ragUri = (process.env.RAG_URI || 'http://localhost:8000').replace(
      /\/$/,
      '',
    );
    let targetUrl = '';
    if (ragUri.endsWith('/api/v1')) {
      targetUrl = `${ragUri}/nlp/generate-roadmap-rag`;
    } else {
      targetUrl = `${ragUri}/api/v1/nlp/generate-roadmap-rag`;
    }

    // Start streaming asynchronously
    void (async () => {
      // Maps RAG-local refs -> saved DB node ids so we can wire dependency
      // edges. RAG emits nodes in topological order, so a node's prerequisites
      // are already saved by the time we process it.
      const refToId = new Map<string, number>();

      const processNode = async (rawNode: any) => {
        const savedNode = await this.nodeService.create({
          roadmapId,
          title: rawNode.title,
          description: rawNode.description || null,
          tags: rawNode.tags || [],
          resources: rawNode.resources || [],
          isCompleted: false,
        });

        const rawRef = rawNode.ref;
        const rawDependsOn = rawNode.dependsOn;

        console.log(
          `[stream] node saved id=${savedNode.id} title="${savedNode.title}" ` +
            `ref=${JSON.stringify(rawRef)} dependsOn=${JSON.stringify(rawDependsOn)} ` +
            `refToId=[${[...refToId.entries()].map(([k, v]) => `${k}→${v}`).join(', ')}]`,
        );

        if (rawRef != null) {
          refToId.set(String(rawRef), savedNode.id);
        }

        // Wire prerequisite edges from `dependsOn` refs (unknown refs ignored).
        const edges: Array<{
          id: number;
          roadmapId: number;
          sourceNodeId: number;
          targetNodeId: number;
        }> = [];
        const dependsOn: unknown[] = Array.isArray(rawDependsOn)
          ? rawDependsOn
          : [];
        for (const depRef of dependsOn) {
          const sourceId = refToId.get(String(depRef));
          console.log(
            `[stream]   dep ref=${depRef} → sourceId=${sourceId ?? 'MISSING (ref not in refToId)'}`,
          );
          if (sourceId) {
            try {
              const edge = await this.nodeService.createEdge(
                roadmapId,
                sourceId,
                savedNode.id,
              );
              edges.push(edge);
              console.log(
                `[stream]   edge created id=${edge.id} ${sourceId}→${savedNode.id}`,
              );
            } catch (edgeErr) {
              console.error(
                `[stream]   FAILED to create edge ${sourceId}→${savedNode.id}:`,
                edgeErr,
              );
            }
          }
        }

        console.log(
          `[stream] publishing node id=${savedNode.id} with ${edges.length} edge(s)`,
        );

        pubSub.publish(`roadmapGenerationStream_${roadmapId}`, {
          roadmapGenerationStream: {
            roadmapId,
            eventData: { event: 'node', node: savedNode, edges },
          },
        });
      };

      const handleLine = async (line: string) => {
        if (!line) return;
        try {
          const data = JSON.parse(line);
          if (data.event === 'node' && data.node) {
            await processNode(data.node);
          }
        } catch (e) {
          console.error('Error parsing/saving node from stream:', e);
        }
      };

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            customization_answers: customizationAnswers || [],
          }),
        });

        if (!response.ok || !response.body) {
          if (response.status === 422) {
            const body = await response.json().catch(() => null);
            if (
              body &&
              typeof body === 'object' &&
              (body as any).signal === 'unsupported_domain'
            ) {
              throw new Error(
                (body as any).message ||
                  "We don't support this domain at this time.",
              );
            }
            throw new Error(
              'You are out of free trials. It will reset every 24 hours.',
            );
          }
          throw new Error(
            `Failed to fetch from RAG service. Status: ${response.status}`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value || new Uint8Array(), { stream: true });
          let boundary = buffer.indexOf('\n');
          while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);
            boundary = buffer.indexOf('\n');
            await handleLine(line);
          }
        }

        if (buffer.trim()) {
          await handleLine(buffer.trim());
        }

        pubSub.publish(`roadmapGenerationStream_${roadmapId}`, {
          roadmapGenerationStream: {
            roadmapId,
            eventData: { event: 'done' },
          },
        });
      } catch (err) {
        console.error('Error in generateRoadmapStream:', err);
        pubSub.publish(`roadmapGenerationStream_${roadmapId}`, {
          roadmapGenerationStream: {
            roadmapId,
            eventData: { event: 'error', message: (err as Error).message },
          },
        });
      }
    })();

    return true;
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
    return this.roadmapService.findPublicById(id);
  }
}
