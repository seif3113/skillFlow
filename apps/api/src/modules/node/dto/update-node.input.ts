import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateNodeInput } from './create-node.input';

@InputType({ description: 'Input for updating an existing node.' })
export class UpdateNodeInput extends PartialType(CreateNodeInput) {
  @Field(() => Int, { description: 'ID of the node to update.' })
  id: number;
}
