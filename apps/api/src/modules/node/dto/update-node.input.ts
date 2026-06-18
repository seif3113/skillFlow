export interface UpdateNodeInput {
  id: number;
  roadmapId?: number;
  title?: string;
  description?: string;
  tags?: string[];
  resources?: Record<string, string>[];
  isCompleted?: boolean;
}
