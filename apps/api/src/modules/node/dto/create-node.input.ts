import { InputType, Field, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType({ description: 'Input for creating a new node.' })
export class CreateNodeInput {
  @Field(() => Int, { description: 'ID of the parent roadmap.' })
  roadmapId: number;

  @Field(() => String, { description: 'Title of the node.' })
  title: string;

  @Field(() => String, { nullable: true, description: 'Optional description.' })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Optional array of tag strings.' })
  tags?: string[];

  @Field(() => GraphQLJSON, { nullable: true, description: 'Optional array of resource objects.' })
  resources?: Record<string, string>[];
}
