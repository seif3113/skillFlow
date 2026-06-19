
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export interface CreateNodeInput {
    roadmapId: number;
    title: string;
    description?: Nullable<string>;
    tags?: Nullable<JSON>;
    resources?: Nullable<JSON>;
    isCompleted?: Nullable<boolean>;
}

export interface UpdateNodeInput {
    id: number;
    roadmapId?: Nullable<number>;
    title?: Nullable<string>;
    description?: Nullable<string>;
    tags?: Nullable<JSON>;
    resources?: Nullable<JSON>;
    isCompleted?: Nullable<boolean>;
}

export interface CreateRoadmapInput {
    userId?: Nullable<number>;
    title: string;
    description?: Nullable<string>;
    learningProfileId?: Nullable<number>;
    isPublished?: Nullable<boolean>;
}

export interface UpdateRoadmapInput {
    id: number;
    userId?: Nullable<number>;
    title?: Nullable<string>;
    description?: Nullable<string>;
    learningProfileId?: Nullable<number>;
    isPublished?: Nullable<boolean>;
}

export interface UpdateUserInput {
    id: number;
    name?: Nullable<string>;
    email?: Nullable<string>;
}

export interface Node {
    id: number;
    roadmapId: number;
    title: string;
    description?: Nullable<string>;
    tags?: Nullable<JSON>;
    resources?: Nullable<JSON>;
    isCompleted: boolean;
    createdAt: DateTime;
    updatedAt: DateTime;
    chats?: Nullable<NodeExplanationChat[]>;
}

export interface NodeExplanationChat {
    id: number;
    nodeId: number;
    userId: number;
    sender: string;
    message: JSON;
    sentAt: DateTime;
}

export interface DeleteNodeResult {
    success: boolean;
    message: string;
}

export interface NodeEdge {
    id: number;
    roadmapId: number;
    sourceNodeId: number;
    targetNodeId: number;
}

export interface IQuery {
    node(id: number): Nullable<Node> | Promise<Nullable<Node>>;
    nodesByRoadmap(roadmapId: number): Node[] | Promise<Node[]>;
    nodeChats(nodeId: number, userId: number): NodeExplanationChat[] | Promise<NodeExplanationChat[]>;
    searchNodeResources(topic: string, limit?: Nullable<number>, type?: Nullable<string>): Nullable<JSON>[] | Promise<Nullable<JSON>[]>;
    nodeQuiz(nodeId: number): Nullable<Quiz> | Promise<Nullable<Quiz>>;
    roadmaps(): Roadmap[] | Promise<Roadmap[]>;
    roadmap(id: number): Nullable<Roadmap> | Promise<Nullable<Roadmap>>;
    roadmapsByUser(userId: number): Roadmap[] | Promise<Roadmap[]>;
    roadmapsByLearningProfile(learningProfileId: number): Roadmap[] | Promise<Roadmap[]>;
    roadmapLearningProfiles(userId: number): RoadmapLearningProfile[] | Promise<RoadmapLearningProfile[]>;
    publicRoadmaps(): PublicRoadmap[] | Promise<PublicRoadmap[]>;
    publicRoadmap(id: number): Nullable<PublicRoadmap> | Promise<Nullable<PublicRoadmap>>;
    roadmapCustomizationQuestions(message: string): RoadmapCustomizationQuestion[] | Promise<RoadmapCustomizationQuestion[]>;
    user(id: number): Nullable<User> | Promise<Nullable<User>>;
}

export interface IMutation {
    createNode(input: CreateNodeInput): Node | Promise<Node>;
    updateNode(input: UpdateNodeInput): Node | Promise<Node>;
    deleteNode(id: number): DeleteNodeResult | Promise<DeleteNodeResult>;
    sendNodeChatMessage(nodeId: number, userId: number, sender: string, message: JSON): NodeExplanationChat | Promise<NodeExplanationChat>;
    createNodeEdge(roadmapId: number, sourceNodeId: number, targetNodeId: number): NodeEdge | Promise<NodeEdge>;
    deleteNodeEdge(id: number): DeleteNodeResult | Promise<DeleteNodeResult>;
    generateNodeQuiz(nodeId: number): Quiz | Promise<Quiz>;
    submitQuizAttempt(nodeId: number, answers: number[]): QuizResult | Promise<QuizResult>;
    createRoadmap(input: CreateRoadmapInput): Roadmap | Promise<Roadmap>;
    updateRoadmap(input: UpdateRoadmapInput): Roadmap | Promise<Roadmap>;
    updateRoadmapAi(id: number, message: string): Node[] | Promise<Node[]>;
    deleteRoadmap(id: number): DeleteRoadmapResult | Promise<DeleteRoadmapResult>;
    publishRoadmap(id: number): Roadmap | Promise<Roadmap>;
    forkRoadmap(id: number, userId: number): Roadmap | Promise<Roadmap>;
    createRoadmapLearningProfile(userId: number, goal?: Nullable<string>, level?: Nullable<string>, background?: Nullable<string>, timeAvailability?: Nullable<string>, preferences?: Nullable<JSON>): RoadmapLearningProfile | Promise<RoadmapLearningProfile>;
    generateRoadmapStream(roadmapId: number, topic: string, customizationAnswers?: Nullable<string[]>): boolean | Promise<boolean>;
    updateUser(updateUserInput: UpdateUserInput): User | Promise<User>;
    removeUser(id: number): User | Promise<User>;
}

export interface Quiz {
    id: number;
    nodeId: number;
    title: string;
    questions: QuizQuestion[];
}

export interface QuizQuestion {
    id: number;
    question: string;
    choices: JSON;
}

export interface QuizQuestionResult {
    questionId: number;
    correct: boolean;
    correctAnswer: number;
    explanation?: Nullable<string>;
}

export interface QuizResult {
    score: number;
    passed: boolean;
    passThreshold: number;
    results: QuizQuestionResult[];
    nodeCompleted: boolean;
}

export interface Roadmap {
    id: number;
    userId: number;
    learningProfileId?: Nullable<number>;
    title: string;
    description?: Nullable<string>;
    isPublished: boolean;
    createdAt: DateTime;
    updatedAt: DateTime;
    nodes?: Nullable<Node[]>;
    edges?: Nullable<NodeEdge[]>;
    learningProfile?: Nullable<RoadmapLearningProfile>;
    editLogs?: Nullable<RoadmapEditLog[]>;
}

export interface PublicRoadmap {
    id: number;
    userName: string;
    title: string;
    description?: Nullable<string>;
    isPublished: boolean;
    createdAt: DateTime;
    updatedAt: DateTime;
    nodes?: Nullable<Node[]>;
}

export interface RoadmapLearningProfile {
    id: number;
    userId: number;
    goal?: Nullable<string>;
    level?: Nullable<string>;
    background?: Nullable<string>;
    timeAvailability?: Nullable<string>;
    preferences: JSON;
    createdAt: DateTime;
}

export interface RoadmapEditLog {
    id: number;
    roadmapId: number;
    sender: string;
    intent: string;
    message: JSON;
    accept?: Nullable<boolean>;
    sentAt: DateTime;
}

export interface DeleteRoadmapResult {
    success: boolean;
    message: string;
}

export interface RoadmapCustomizationQuestion {
    question: string;
    choices: string[];
}

export interface RoadmapStreamEvent {
    event: string;
    node?: Nullable<Node>;
    edges?: Nullable<NodeEdge[]>;
    message?: Nullable<string>;
}

export interface ISubscription {
    roadmapGenerationStream(roadmapId: number): RoadmapStreamEvent | Promise<RoadmapStreamEvent>;
}

export interface User {
    id: number;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: Nullable<string>;
    createdAt: DateTime;
    updatedAt: DateTime;
    preferences: JSON;
}

export type JSON = any;
export type DateTime = any;
type Nullable<T> = T | null;
