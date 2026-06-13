export interface UpdateRoadmapInput {
  id: number;
  userId?: number;
  title?: string;
  description?: string;
  learningProfileId?: number;
  isPublished?: boolean;
}
