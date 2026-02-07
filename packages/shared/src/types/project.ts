export interface ProjectVO {
  id: string;
  name: string;
  status: string;
  currentStep: string;
  createdAt: string;
  updatedAt: string;
}

// EpisodeVO 已迁移到 episode.ts，此处重导出以保持向后兼容
export type { EpisodeVO } from './episode';
