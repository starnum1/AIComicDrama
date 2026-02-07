import { ShotType, CameraMovement, TransitionType, ContinuityStrength } from '../enums/shot-type.js';
/** 镜头类型中文映射 */
export const SHOT_TYPE_LABELS = {
    [ShotType.Wide]: '远景',
    [ShotType.Medium]: '中景',
    [ShotType.CloseUp]: '近景',
    [ShotType.ExtremeCloseUp]: '特写',
    [ShotType.OverShoulder]: '过肩',
    [ShotType.LowAngle]: '仰角',
    [ShotType.HighAngle]: '俯角',
    [ShotType.POV]: '主观视角',
};
/** 运镜方式中文映射 */
export const CAMERA_MOVEMENT_LABELS = {
    [CameraMovement.Static]: '静止',
    [CameraMovement.PushIn]: '推进',
    [CameraMovement.PullOut]: '拉远',
    [CameraMovement.PanLeft]: '左摇',
    [CameraMovement.PanRight]: '右摇',
    [CameraMovement.TiltUp]: '上摇',
    [CameraMovement.TiltDown]: '下摇',
    [CameraMovement.Follow]: '跟随',
    [CameraMovement.Handheld]: '手持',
};
/** 转场类型中文映射 */
export const TRANSITION_TYPE_LABELS = {
    [TransitionType.Cut]: '硬切',
    [TransitionType.Dissolve]: '溶解',
    [TransitionType.FadeIn]: '淡入',
    [TransitionType.FadeOut]: '淡出',
    [TransitionType.SmashCut]: '跳切',
};
/** 连续性强度中文映射 */
export const CONTINUITY_STRENGTH_LABELS = {
    [ContinuityStrength.Strong]: '强',
    [ContinuityStrength.Medium]: '中',
    [ContinuityStrength.Weak]: '弱',
};
//# sourceMappingURL=shot.js.map