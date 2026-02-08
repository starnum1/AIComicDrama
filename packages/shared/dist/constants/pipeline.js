/** 流水线步骤顺序 */
export const PIPELINE_STEP_ORDER = [
    'asset',
    'episode',
    'storyboard',
    'anchor',
    'video',
    'assembly',
];
/** 需要用户确认的步骤（每步完成后暂停，等待用户确认再继续） */
export const PIPELINE_REVIEW_STEPS = [
    'asset',
    'episode',
    'storyboard',
];
/** 步骤中文名称映射 */
export const PIPELINE_STEP_LABELS = {
    asset: '视觉资产',
    episode: '分集规划',
    storyboard: '分镜脚本',
    anchor: '锚点图生成',
    video: '视频生成',
    assembly: '成片拼接',
};
//# sourceMappingURL=pipeline.js.map