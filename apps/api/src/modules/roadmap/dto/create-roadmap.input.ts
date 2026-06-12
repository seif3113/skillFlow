import { InputType, Field, Int } from '@nestjs/graphql';

@InputType({ description: 'Input for creating a new roadmap.' })
export class CreateRoadmapInput {
  @Field(() => Int, { description: 'ID of the user who owns this roadmap.' })
  userId: number;

  @Field(() => String, { description: 'Title of the roadmap.' })
  title: string;

  @Field(() => String, { nullable: true, description: 'Optional description.' })
  description?: string;

  @Field(() => Int, { nullable: true, description: 'Optional associated learning profile ID.' })
  learningProfileId?: number;

  @Field(() => Boolean, { nullable: true, defaultValue: false, description: 'Publish immediately on creation.' })
  isPublished?: boolean;
}
