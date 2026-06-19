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
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
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
    @Args('customizationAnswers') customizationAnswers?: string[],
  ) {
    const ragUri = (process.env.RAG_URI || 'http://localhost:8000').replace(/\/$/, '');
    let targetUrl = '';
    if (ragUri.endsWith('/api/v1')) {
      targetUrl = `${ragUri}/nlp/generate-roadmap-rag`;
    } else {
      targetUrl = `${ragUri}/api/v1/nlp/generate-roadmap-rag`;
    }

    // Start streaming asynchronously
    (async () => {
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
          throw new Error(`Failed to fetch from RAG service. Status: ${response.status}`);
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

            if (line) {
              try {
                const data = JSON.parse(line);
                if (data.event === 'node' && data.node) {
                  const rawNode = data.node;
                  const savedNode = await this.nodeService.create({
                    roadmapId,
                    title: rawNode.title,
                    description: rawNode.description || null,
                    tags: rawNode.tags || [],
                    resources: rawNode.resources || [],
                    isCompleted: false,
                  });

                  pubSub.publish(`roadmapGenerationStream_${roadmapId}`, {
                    roadmapGenerationStream: {
                      roadmapId,
                      eventData: { event: 'node', node: savedNode },
                    },
                  });
                } else if (data.event === 'done') {
                  // Done event handled below
                }
              } catch (e) {
                console.error('Error parsing/saving node from stream:', e);
              }
            }
          }
        }

        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim());
            if (data.event === 'node' && data.node) {
              const rawNode = data.node;
              const savedNode = await this.nodeService.create({
                roadmapId,
                title: rawNode.title,
                description: rawNode.description || null,
                tags: rawNode.tags || [],
                resources: rawNode.resources || [],
                isCompleted: false,
              });
              pubSub.publish(`roadmapGenerationStream_${roadmapId}`, {
                roadmapGenerationStream: {
                  roadmapId,
                  eventData: { event: 'node', node: savedNode },
                },
              });
            }
          } catch (e) {
            console.error('Error parsing remaining buffer:', e);
          }
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
    return this.roadmapService.findById(id);
  }
}
