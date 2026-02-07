import type { PipelineStep } from '../types/pipeline.js';

/** 流水线步骤顺序 */
export const PIPELINE_STEP_ORDER: PipelineStep[] = [
  'analysis',
  'asset',
  'storyboard',
  'anchor',
  'video',
  'assembly',
];

/** 需要用户确认的步骤 */
export const PIPELINE_REVIEW_STEPS: PipelineStep[] = ['asset'];
