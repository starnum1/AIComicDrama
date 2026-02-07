export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["Created"] = "created";
    ProjectStatus["Analyzing"] = "analyzing";
    ProjectStatus["AssetsGenerating"] = "assets_generating";
    ProjectStatus["AssetReview"] = "asset_review";
    ProjectStatus["Storyboarding"] = "storyboarding";
    ProjectStatus["Anchoring"] = "anchoring";
    ProjectStatus["VideoGenerating"] = "video_generating";
    ProjectStatus["Assembling"] = "assembling";
    ProjectStatus["Completed"] = "completed";
    ProjectStatus["Failed"] = "failed";
})(ProjectStatus || (ProjectStatus = {}));
// TaskStatus 已迁移到 task-status.ts，此处重导出以保持向后兼容
export { TaskStatus } from './task-status.js';
//# sourceMappingURL=project-status.js.map