"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.ProjectStatus = void 0;
var ProjectStatus;
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
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
// TaskStatus 已迁移到 task-status.ts，此处重导出以保持向后兼容
var task_status_1 = require("./task-status");
Object.defineProperty(exports, "TaskStatus", { enumerable: true, get: function () { return task_status_1.TaskStatus; } });
//# sourceMappingURL=project-status.js.map