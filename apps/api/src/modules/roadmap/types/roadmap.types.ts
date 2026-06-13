export interface RoadmapType {
  id: number;
  userId: number;
  learningProfileId?: number | null;
  title: string;
  description?: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes?: any[];
}

export interface DeleteRoadmapResult {
  success: boolean;
  message: string;
}
