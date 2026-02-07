"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOTS_PER_EPISODE_MAX = exports.SHOTS_PER_EPISODE_MIN = exports.SHOT_MAX_DURATION = exports.SHOT_MIN_DURATION = exports.EPISODE_MAX_DURATION = exports.EPISODE_MIN_DURATION = exports.NOVEL_MAX_CHARS = exports.NOVEL_MIN_CHARS = void 0;
/** 小说字数限制 */
exports.NOVEL_MIN_CHARS = 8000;
exports.NOVEL_MAX_CHARS = 30000;
/** 每集时长限制（分钟） */
exports.EPISODE_MIN_DURATION = 2;
exports.EPISODE_MAX_DURATION = 3;
/** 镜头时长限制（秒）— 适配豆包API */
exports.SHOT_MIN_DURATION = 4;
exports.SHOT_MAX_DURATION = 12;
/** 单集镜头数量建议范围 */
exports.SHOTS_PER_EPISODE_MIN = 10;
exports.SHOTS_PER_EPISODE_MAX = 25;
//# sourceMappingURL=limits.js.map