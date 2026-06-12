import { ObjectType, Field, Int } from '@nestjs/graphql';


@ObjectType({ description: 'A learning roadmap owned by a user.' })
export class RoadmapType {
  @Field(() => Int, { description: 'Primary key.' })
  id: number;

  @Field(() => Int, { description: 'ID of the owning user.' })
  userId: number;

  @Field(() => Int, { nullable: true, description: 'Associated learning profile ID.' })
  learningProfileId?: number | null;

  @Field(() => String, { description: 'Title of the roadmap.' })
  title: string;

  @Field(() => String, { nullable: true, description: 'Optional description.' })
  description?: string | null;

  @Field(() => Boolean, { description: 'Whether the roadmap is publicly published.' })
  isPublished: boolean;

  @Field(() => Date, { description: 'Creation timestamp (ISO 8601).' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp (ISO 8601).' })
  updatedAt: Date;
}


@ObjectType({ description: 'Result of a delete roadmap operation.' })
export class DeleteRoadmapResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}
