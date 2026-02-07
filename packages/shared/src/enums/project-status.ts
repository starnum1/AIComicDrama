export enum ProjectStatus {
  Created = 'created',
  Analyzing = 'analyzing',
  AssetsGenerating = 'assets_generating',
  AssetReview = 'asset_review',
  Storyboarding = 'storyboarding',
  Anchoring = 'anchoring',
  VideoGenerating = 'video_generating',
  Assembling = 'assembling',
  Completed = 'completed',
  Failed = 'failed',
}

// TaskStatus 已迁移到 task-status.ts，此处重导出以保持向后兼容
export { TaskStatus } from './task-status';
