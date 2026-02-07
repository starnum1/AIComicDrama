"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTINUITY_STRENGTH_LABELS = exports.TRANSITION_TYPE_LABELS = exports.CAMERA_MOVEMENT_LABELS = exports.SHOT_TYPE_LABELS = void 0;
const shot_type_1 = require("../enums/shot-type");
/** 镜头类型中文映射 */
exports.SHOT_TYPE_LABELS = {
    [shot_type_1.ShotType.Wide]: '远景',
    [shot_type_1.ShotType.Medium]: '中景',
    [shot_type_1.ShotType.CloseUp]: '近景',
    [shot_type_1.ShotType.ExtremeCloseUp]: '特写',
    [shot_type_1.ShotType.OverShoulder]: '过肩',
    [shot_type_1.ShotType.LowAngle]: '仰角',
    [shot_type_1.ShotType.HighAngle]: '俯角',
    [shot_type_1.ShotType.POV]: '主观视角',
};
/** 运镜方式中文映射 */
exports.CAMERA_MOVEMENT_LABELS = {
    [shot_type_1.CameraMovement.Static]: '静止',
    [shot_type_1.CameraMovement.PushIn]: '推进',
    [shot_type_1.CameraMovement.PullOut]: '拉远',
    [shot_type_1.CameraMovement.PanLeft]: '左摇',
    [shot_type_1.CameraMovement.PanRight]: '右摇',
    [shot_type_1.CameraMovement.TiltUp]: '上摇',
    [shot_type_1.CameraMovement.TiltDown]: '下摇',
    [shot_type_1.CameraMovement.Follow]: '跟随',
    [shot_type_1.CameraMovement.Handheld]: '手持',
};
/** 转场类型中文映射 */
exports.TRANSITION_TYPE_LABELS = {
    [shot_type_1.TransitionType.Cut]: '硬切',
    [shot_type_1.TransitionType.Dissolve]: '溶解',
    [shot_type_1.TransitionType.FadeIn]: '淡入',
    [shot_type_1.TransitionType.FadeOut]: '淡出',
    [shot_type_1.TransitionType.SmashCut]: '跳切',
};
/** 连续性强度中文映射 */
exports.CONTINUITY_STRENGTH_LABELS = {
    [shot_type_1.ContinuityStrength.Strong]: '强',
    [shot_type_1.ContinuityStrength.Medium]: '中',
    [shot_type_1.ContinuityStrength.Weak]: '弱',
};
//# sourceMappingURL=shot.js.map