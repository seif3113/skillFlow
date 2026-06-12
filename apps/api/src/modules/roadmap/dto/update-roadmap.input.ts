import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateRoadmapInput } from './create-roadmap.input';

@InputType({ description: 'Input for updating an existing roadmap.' })
export class UpdateRoadmapInput extends PartialType(CreateRoadmapInput) {
  @Field(() => Int, { description: 'ID of the roadmap to update.' })
  id: number;
}
