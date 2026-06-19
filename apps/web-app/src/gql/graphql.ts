/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type CreateNodeInput = {
  description?: string | null | undefined;
  isCompleted?: boolean | null | undefined;
  resources?: unknown;
  roadmapId: number;
  tags?: unknown;
  title: string;
};

export type CreateRoadmapInput = {
  description?: string | null | undefined;
  isPublished?: boolean | null | undefined;
  learningProfileId?: number | null | undefined;
  title: string;
  userId?: number | null | undefined;
};

export type UpdateNodeInput = {
  description?: string | null | undefined;
  id: number;
  isCompleted?: boolean | null | undefined;
  resources?: unknown;
  roadmapId?: number | null | undefined;
  tags?: unknown;
  title?: string | null | undefined;
};

export type RoadmapNodeFieldsFragment = { __typename: 'Node', id: number, roadmapId: number, title: string, description: string | null, tags: unknown, resources: unknown, isCompleted: boolean };

export type RoadmapEdgeFieldsFragment = { __typename: 'NodeEdge', id: number, roadmapId: number, sourceNodeId: number, targetNodeId: number };

export type MyRoadmapsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyRoadmapsQuery = { roadmaps: Array<{ __typename: 'Roadmap', id: number, title: string, description: string | null, isPublished: boolean, createdAt: string, updatedAt: string, nodes: Array<{ __typename: 'Node', id: number, isCompleted: boolean }> | null }> };

export type DeleteRoadmapMutationVariables = Exact<{
  id: number;
}>;


export type DeleteRoadmapMutation = { deleteRoadmap: { __typename: 'DeleteRoadmapResult', success: boolean, message: string } };

export type GetRoadmapQueryVariables = Exact<{
  id: number;
}>;


export type GetRoadmapQuery = { roadmap: { __typename: 'Roadmap', id: number, title: string, description: string | null, isPublished: boolean, nodes: Array<{ __typename: 'Node', id: number, roadmapId: number, title: string, description: string | null, tags: unknown, resources: unknown, isCompleted: boolean }> | null, edges: Array<{ __typename: 'NodeEdge', id: number, roadmapId: number, sourceNodeId: number, targetNodeId: number }> | null } | null };

export type RoadmapCustomizationQuestionsQueryVariables = Exact<{
  message: string;
}>;


export type RoadmapCustomizationQuestionsQuery = { roadmapCustomizationQuestions: Array<{ __typename: 'RoadmapCustomizationQuestion', question: string, choices: Array<string> }> };

export type CreateRoadmapMutationVariables = Exact<{
  input: CreateRoadmapInput;
}>;


export type CreateRoadmapMutation = { createRoadmap: { __typename: 'Roadmap', id: number, title: string, description: string | null } };

export type GenerateRoadmapStreamMutationVariables = Exact<{
  roadmapId: number;
  topic: string;
  customizationAnswers?: Array<string> | string | null | undefined;
}>;


export type GenerateRoadmapStreamMutation = { generateRoadmapStream: boolean };

export type RoadmapGenerationStreamSubscriptionVariables = Exact<{
  roadmapId: number;
}>;


export type RoadmapGenerationStreamSubscription = { roadmapGenerationStream: { __typename: 'RoadmapStreamEvent', event: string, message: string | null, node: { __typename: 'Node', id: number, roadmapId: number, title: string, description: string | null, tags: unknown, resources: unknown, isCompleted: boolean } | null, edges: Array<{ __typename: 'NodeEdge', id: number, roadmapId: number, sourceNodeId: number, targetNodeId: number }> | null } };

export type CreateNodeMutationVariables = Exact<{
  input: CreateNodeInput;
}>;


export type CreateNodeMutation = { createNode: { __typename: 'Node', id: number, roadmapId: number, title: string, description: string | null, tags: unknown, resources: unknown, isCompleted: boolean } };

export type UpdateNodeMutationVariables = Exact<{
  input: UpdateNodeInput;
}>;


export type UpdateNodeMutation = { updateNode: { __typename: 'Node', id: number, roadmapId: number, title: string, description: string | null, tags: unknown, resources: unknown, isCompleted: boolean } };

export type DeleteNodeMutationVariables = Exact<{
  id: number;
}>;


export type DeleteNodeMutation = { deleteNode: { __typename: 'DeleteNodeResult', success: boolean, message: string } };

export type CreateNodeEdgeMutationVariables = Exact<{
  roadmapId: number;
  sourceNodeId: number;
  targetNodeId: number;
}>;


export type CreateNodeEdgeMutation = { createNodeEdge: { __typename: 'NodeEdge', id: number, roadmapId: number, sourceNodeId: number, targetNodeId: number } };

export type DeleteNodeEdgeMutationVariables = Exact<{
  id: number;
}>;


export type DeleteNodeEdgeMutation = { deleteNodeEdge: { __typename: 'DeleteNodeResult', success: boolean, message: string } };

export const RoadmapNodeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapNodeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Node"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"resources"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}}]} as unknown as DocumentNode<RoadmapNodeFieldsFragment, unknown>;
export const RoadmapEdgeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapEdgeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NodeEdge"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}}]}}]} as unknown as DocumentNode<RoadmapEdgeFieldsFragment, unknown>;
export const MyRoadmapsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyRoadmaps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roadmaps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}}]}}]}}]} as unknown as DocumentNode<MyRoadmapsQuery, MyRoadmapsQueryVariables>;
export const DeleteRoadmapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRoadmap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRoadmap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteRoadmapMutation, DeleteRoadmapMutationVariables>;
export const GetRoadmapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRoadmap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roadmap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isPublished"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapNodeFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapEdgeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapNodeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Node"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"resources"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapEdgeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NodeEdge"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}}]}}]} as unknown as DocumentNode<GetRoadmapQuery, GetRoadmapQueryVariables>;
export const RoadmapCustomizationQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoadmapCustomizationQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roadmapCustomizationQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"choices"}}]}}]}}]} as unknown as DocumentNode<RoadmapCustomizationQuestionsQuery, RoadmapCustomizationQuestionsQueryVariables>;
export const CreateRoadmapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRoadmap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRoadmapInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRoadmap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]} as unknown as DocumentNode<CreateRoadmapMutation, CreateRoadmapMutationVariables>;
export const GenerateRoadmapStreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateRoadmapStream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customizationAnswers"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateRoadmapStream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"roadmapId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}}},{"kind":"Argument","name":{"kind":"Name","value":"topic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic"}}},{"kind":"Argument","name":{"kind":"Name","value":"customizationAnswers"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customizationAnswers"}}}]}]}}]} as unknown as DocumentNode<GenerateRoadmapStreamMutation, GenerateRoadmapStreamMutationVariables>;
export const RoadmapGenerationStreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"RoadmapGenerationStream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roadmapGenerationStream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"roadmapId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"event"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapNodeFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapEdgeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapNodeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Node"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"resources"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapEdgeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NodeEdge"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}}]}}]} as unknown as DocumentNode<RoadmapGenerationStreamSubscription, RoadmapGenerationStreamSubscriptionVariables>;
export const CreateNodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapNodeFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapNodeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Node"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"resources"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}}]} as unknown as DocumentNode<CreateNodeMutation, CreateNodeMutationVariables>;
export const UpdateNodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateNode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapNodeFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapNodeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Node"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"resources"}},{"kind":"Field","name":{"kind":"Name","value":"isCompleted"}}]}}]} as unknown as DocumentNode<UpdateNodeMutation, UpdateNodeMutationVariables>;
export const DeleteNodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteNodeMutation, DeleteNodeMutationVariables>;
export const CreateNodeEdgeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNodeEdge"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceNodeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetNodeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNodeEdge"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"roadmapId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roadmapId"}}},{"kind":"Argument","name":{"kind":"Name","value":"sourceNodeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceNodeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"targetNodeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetNodeId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RoadmapEdgeFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RoadmapEdgeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"NodeEdge"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roadmapId"}},{"kind":"Field","name":{"kind":"Name","value":"sourceNodeId"}},{"kind":"Field","name":{"kind":"Name","value":"targetNodeId"}}]}}]} as unknown as DocumentNode<CreateNodeEdgeMutation, CreateNodeEdgeMutationVariables>;
export const DeleteNodeEdgeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNodeEdge"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNodeEdge"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteNodeEdgeMutation, DeleteNodeEdgeMutationVariables>;