export interface CreateNodeInput {
  roadmapId: number;
  title: string;
  description?: string;
  tags?: string[];
  resources?: Record<string, string>[];
}
