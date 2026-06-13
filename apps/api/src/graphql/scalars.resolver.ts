import { Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { GraphQLScalarType, Kind } from 'graphql';

@Resolver()
export class ScalarsResolver {
  // JSON scalar is already provided by graphql-type-json
  JSON = GraphQLJSON;

  // Simple DateTime scalar implementation
  DateTime = new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value: any) {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    parseValue(value: any) {
      return new Date(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      return null;
    },
  });
}
