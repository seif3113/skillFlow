import { ObjectType, Field, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType({ description: 'A single learning node belonging to a roadmap.' })
export class NodeType {
  @Field(() => Int, { description: 'Primary key.' })
  id: number;

  @Field(() => Int, { description: 'ID of the parent roadmap.' })
  roadmapId: number;

  @Field(() => String, { description: 'Title of the node.' })
  title: string;

  @Field(() => String, { nullable: true, description: 'Optional description.' })
  description?: string | null;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Array of tag strings.' })
  tags?: string[] | null;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Array of resource objects.' })
  resources?: Record<string, string>[] | null;

  @Field(() => Date, { description: 'Creation timestamp.' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp.' })
  updatedAt: Date;
}

@ObjectType({ description: 'Result of a delete node operation.' })
export class DeleteNodeResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}
