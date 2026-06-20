export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  JSON: { input: any; output: any; }
};

export type CreateNodeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isCompleted?: InputMaybe<Scalars['Boolean']['input']>;
  resources?: InputMaybe<Scalars['JSON']['input']>;
  roadmapId: Scalars['Int']['input'];
  tags?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
};

export type CreateRoadmapInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublished?: InputMaybe<Scalars['Boolean']['input']>;
  learningProfileId?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
  userId: Scalars['Int']['input'];
};

export type DeleteNodeResult = {
  __typename?: 'DeleteNodeResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteRoadmapResult = {
  __typename?: 'DeleteRoadmapResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addQuestionToQuiz: Question;
  createNode: Node;
  createQuiz: Quiz;
  createRoadmap: Roadmap;
  createRoadmapLearningProfile: RoadmapLearningProfile;
  deleteNode: DeleteNodeResult;
  deleteRoadmap: DeleteRoadmapResult;
  forkRoadmap: Roadmap;
  generateRoadmapStream: Scalars['Boolean']['output'];
  publishRoadmap: Roadmap;
  removeUser: User;
  sendNodeChatMessage: NodeExplanationChat;
  updateNode: Node;
  updateRoadmap: Roadmap;
  updateRoadmapAi: Array<Node>;
  updateUser: User;
};


export type MutationAddQuestionToQuizArgs = {
  answer: Scalars['Int']['input'];
  choices: Scalars['JSON']['input'];
  explanation?: InputMaybe<Scalars['String']['input']>;
  question: Scalars['String']['input'];
  quizId: Scalars['Int']['input'];
};


export type MutationCreateNodeArgs = {
  input: CreateNodeInput;
};


export type MutationCreateQuizArgs = {
  nodeId: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateRoadmapArgs = {
  input: CreateRoadmapInput;
};


export type MutationCreateRoadmapLearningProfileArgs = {
  background?: InputMaybe<Scalars['String']['input']>;
  goal?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<Scalars['String']['input']>;
  preferences?: InputMaybe<Scalars['JSON']['input']>;
  timeAvailability?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['Int']['input'];
};


export type MutationDeleteNodeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteRoadmapArgs = {
  id: Scalars['Int']['input'];
};


export type MutationForkRoadmapArgs = {
  id: Scalars['Int']['input'];
  userId: Scalars['Int']['input'];
};


export type MutationGenerateRoadmapStreamArgs = {
  customizationAnswers?: InputMaybe<Array<Scalars['String']['input']>>;
  roadmapId: Scalars['Int']['input'];
  topic: Scalars['String']['input'];
};


export type MutationPublishRoadmapArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveUserArgs = {
  id: Scalars['Int']['input'];
};


export type MutationSendNodeChatMessageArgs = {
  message: Scalars['JSON']['input'];
  nodeId: Scalars['Int']['input'];
  sender: Scalars['String']['input'];
  userId: Scalars['Int']['input'];
};


export type MutationUpdateNodeArgs = {
  input: UpdateNodeInput;
};


export type MutationUpdateRoadmapArgs = {
  input: UpdateRoadmapInput;
};


export type MutationUpdateRoadmapAiArgs = {
  id: Scalars['Int']['input'];
  message: Scalars['String']['input'];
};


export type MutationUpdateUserArgs = {
  updateUserInput: UpdateUserInput;
};

export type Node = {
  __typename?: 'Node';
  chats?: Maybe<Array<NodeExplanationChat>>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isCompleted: Scalars['Boolean']['output'];
  quiz?: Maybe<Quiz>;
  resources?: Maybe<Scalars['JSON']['output']>;
  roadmapId: Scalars['Int']['output'];
  tags?: Maybe<Scalars['JSON']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type NodeExplanationChat = {
  __typename?: 'NodeExplanationChat';
  id: Scalars['Int']['output'];
  message: Scalars['JSON']['output'];
  nodeId: Scalars['Int']['output'];
  sender: Scalars['String']['output'];
  sentAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
};

export type PublicRoadmap = {
  __typename?: 'PublicRoadmap';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isPublished: Scalars['Boolean']['output'];
  nodes?: Maybe<Array<Node>>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  node?: Maybe<Node>;
  nodeChats: Array<NodeExplanationChat>;
  nodesByRoadmap: Array<Node>;
  publicRoadmap?: Maybe<PublicRoadmap>;
  publicRoadmaps: Array<PublicRoadmap>;
  questionsByQuiz: Array<Question>;
  quiz?: Maybe<Quiz>;
  quizzes: Array<Quiz>;
  roadmap?: Maybe<Roadmap>;
  roadmapCustomizationQuestions: Array<RoadmapCustomizationQuestion>;
  roadmapLearningProfiles: Array<RoadmapLearningProfile>;
  roadmaps: Array<Roadmap>;
  roadmapsByLearningProfile: Array<Roadmap>;
  roadmapsByUser: Array<Roadmap>;
  searchNodeResources: Array<Maybe<Scalars['JSON']['output']>>;
  user?: Maybe<User>;
};


export type QueryNodeArgs = {
  id: Scalars['Int']['input'];
};


export type QueryNodeChatsArgs = {
  nodeId: Scalars['Int']['input'];
  userId: Scalars['Int']['input'];
};


export type QueryNodesByRoadmapArgs = {
  roadmapId: Scalars['Int']['input'];
};


export type QueryPublicRoadmapArgs = {
  id: Scalars['Int']['input'];
};


export type QueryQuestionsByQuizArgs = {
  quizId: Scalars['Int']['input'];
};


export type QueryQuizArgs = {
  id: Scalars['Int']['input'];
};


export type QueryRoadmapArgs = {
  id: Scalars['Int']['input'];
};


export type QueryRoadmapCustomizationQuestionsArgs = {
  message: Scalars['String']['input'];
};


export type QueryRoadmapLearningProfilesArgs = {
  userId: Scalars['Int']['input'];
};


export type QueryRoadmapsByLearningProfileArgs = {
  learningProfileId: Scalars['Int']['input'];
};


export type QueryRoadmapsByUserArgs = {
  userId: Scalars['Int']['input'];
};


export type QuerySearchNodeResourcesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  topic: Scalars['String']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['Int']['input'];
};

export type Question = {
  __typename?: 'Question';
  answer: Scalars['Int']['output'];
  choices: Scalars['JSON']['output'];
  explanation?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  question: Scalars['String']['output'];
  quizId: Scalars['Int']['output'];
};

export type Quiz = {
  __typename?: 'Quiz';
  id: Scalars['Int']['output'];
  nodeId: Scalars['Int']['output'];
  questions?: Maybe<Array<Question>>;
  title: Scalars['String']['output'];
};

export type Roadmap = {
  __typename?: 'Roadmap';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  editLogs?: Maybe<Array<RoadmapEditLog>>;
  id: Scalars['Int']['output'];
  isPublished: Scalars['Boolean']['output'];
  learningProfile?: Maybe<RoadmapLearningProfile>;
  learningProfileId?: Maybe<Scalars['Int']['output']>;
  nodes?: Maybe<Array<Node>>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
};

export type RoadmapCustomizationQuestion = {
  __typename?: 'RoadmapCustomizationQuestion';
  choices: Array<Scalars['String']['output']>;
  question: Scalars['String']['output'];
};

export type RoadmapEditLog = {
  __typename?: 'RoadmapEditLog';
  accept?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['Int']['output'];
  intent: Scalars['String']['output'];
  message: Scalars['JSON']['output'];
  roadmapId: Scalars['Int']['output'];
  sender: Scalars['String']['output'];
  sentAt: Scalars['DateTime']['output'];
};

export type RoadmapLearningProfile = {
  __typename?: 'RoadmapLearningProfile';
  background?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  goal?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  level?: Maybe<Scalars['String']['output']>;
  preferences: Scalars['JSON']['output'];
  timeAvailability?: Maybe<Scalars['String']['output']>;
  userId: Scalars['Int']['output'];
};

export type RoadmapStreamEvent = {
  __typename?: 'RoadmapStreamEvent';
  event: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Node>;
};

export type Subscription = {
  __typename?: 'Subscription';
  roadmapGenerationStream: RoadmapStreamEvent;
};


export type SubscriptionRoadmapGenerationStreamArgs = {
  roadmapId: Scalars['Int']['input'];
};

export type UpdateNodeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  isCompleted?: InputMaybe<Scalars['Boolean']['input']>;
  resources?: InputMaybe<Scalars['JSON']['input']>;
  roadmapId?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoadmapInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  isPublished?: InputMaybe<Scalars['Boolean']['input']>;
  learningProfileId?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateUserInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  emailVerified: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  preferences: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
};
