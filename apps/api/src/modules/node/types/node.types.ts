export interface NodeType {
  id: number;
  roadmapId: number;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  resources?: Record<string, string>[] | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteNodeResult {
  success: boolean;
  message: string;
}

export interface VectorDbSearchResponse {
  signal: string;
  results: SearchResult[];
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Payload;
}

export interface Payload {
  text: string | Record<string, string>;
  metadata: Metadata;
}

export interface Metadata {
  source: string;
  row: number;
}
