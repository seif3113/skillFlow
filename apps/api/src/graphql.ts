
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
}

export interface UpdateNodeInput {
    id: number;
    roadmapId?: Nullable<number>;
    title?: Nullable<string>;
    description?: Nullable<string>;
    tags?: Nullable<JSON>;
    resources?: Nullable<JSON>;
}

export interface CreateRoadmapInput {
    userId: number;
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
    createdAt: DateTime;
    updatedAt: DateTime;
    chats?: Nullable<NodeExplanationChat[]>;
    quiz?: Nullable<Quiz>;
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

export interface IQuery {
    node(id: number): Nullable<Node> | Promise<Nullable<Node>>;
    nodesByRoadmap(roadmapId: number): Node[] | Promise<Node[]>;
    nodeChats(nodeId: number, userId: number): NodeExplanationChat[] | Promise<NodeExplanationChat[]>;
    quizzes(): Quiz[] | Promise<Quiz[]>;
    quiz(id: number): Nullable<Quiz> | Promise<Nullable<Quiz>>;
    questionsByQuiz(quizId: number): Question[] | Promise<Question[]>;
    roadmaps(): Roadmap[] | Promise<Roadmap[]>;
    roadmap(id: number): Nullable<Roadmap> | Promise<Nullable<Roadmap>>;
    roadmapsByUser(userId: number): Roadmap[] | Promise<Roadmap[]>;
    roadmapsByLearningProfile(learningProfileId: number): Roadmap[] | Promise<Roadmap[]>;
    roadmapLearningProfiles(userId: number): RoadmapLearningProfile[] | Promise<RoadmapLearningProfile[]>;
    user(id: number): Nullable<User> | Promise<Nullable<User>>;
}

export interface IMutation {
    createNode(input: CreateNodeInput): Node | Promise<Node>;
    updateNode(input: UpdateNodeInput): Node | Promise<Node>;
    deleteNode(id: number): DeleteNodeResult | Promise<DeleteNodeResult>;
    sendNodeChatMessage(nodeId: number, userId: number, sender: string, message: JSON): NodeExplanationChat | Promise<NodeExplanationChat>;
    createQuiz(title: string, nodeId: number): Quiz | Promise<Quiz>;
    addQuestionToQuiz(quizId: number, question: string, choices: JSON, answer: number, explanation?: Nullable<string>): Question | Promise<Question>;
    createRoadmap(input: CreateRoadmapInput): Roadmap | Promise<Roadmap>;
    updateRoadmap(input: UpdateRoadmapInput): Roadmap | Promise<Roadmap>;
    deleteRoadmap(id: number): DeleteRoadmapResult | Promise<DeleteRoadmapResult>;
    publishRoadmap(id: number): Roadmap | Promise<Roadmap>;
    createRoadmapLearningProfile(userId: number, goal?: Nullable<string>, level?: Nullable<string>, background?: Nullable<string>, timeAvailability?: Nullable<string>, preferences?: Nullable<JSON>): RoadmapLearningProfile | Promise<RoadmapLearningProfile>;
    updateUser(updateUserInput: UpdateUserInput): User | Promise<User>;
    removeUser(id: number): User | Promise<User>;
}

export interface Quiz {
    id: number;
    title: string;
    nodeId: number;
    questions?: Nullable<Question[]>;
}

export interface Question {
    id: number;
    quizId: number;
    question: string;
    choices: JSON;
    answer: number;
    explanation?: Nullable<string>;
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
    learningProfile?: Nullable<RoadmapLearningProfile>;
    editLogs?: Nullable<RoadmapEditLog[]>;
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
