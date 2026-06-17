export interface NodeType {
  id: number;
  roadmapId: number;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  resources?: Record<string, string>[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteNodeResult {
  success: boolean;
  message: string;
}

export interface FindResourcesResult {
  signal: string;
  result: {
    id: string;
    score: number;
    payload: any;
  }[];
}
