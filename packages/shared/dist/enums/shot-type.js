"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuityStrength = exports.TransitionType = exports.CameraMovement = exports.ShotType = void 0;
var ShotType;
(function (ShotType) {
    ShotType["Wide"] = "wide";
    ShotType["Medium"] = "medium";
    ShotType["CloseUp"] = "close_up";
    ShotType["ExtremeCloseUp"] = "extreme_close_up";
    ShotType["OverShoulder"] = "over_shoulder";
    ShotType["LowAngle"] = "low_angle";
    ShotType["HighAngle"] = "high_angle";
    ShotType["POV"] = "pov";
})(ShotType || (exports.ShotType = ShotType = {}));
var CameraMovement;
(function (CameraMovement) {
    CameraMovement["Static"] = "static";
    CameraMovement["PushIn"] = "push_in";
    CameraMovement["PullOut"] = "pull_out";
    CameraMovement["PanLeft"] = "pan_left";
    CameraMovement["PanRight"] = "pan_right";
    CameraMovement["TiltUp"] = "tilt_up";
    CameraMovement["TiltDown"] = "tilt_down";
    CameraMovement["Follow"] = "follow";
    CameraMovement["Handheld"] = "handheld";
})(CameraMovement || (exports.CameraMovement = CameraMovement = {}));
var TransitionType;
(function (TransitionType) {
    TransitionType["Cut"] = "cut";
    TransitionType["Dissolve"] = "dissolve";
    TransitionType["FadeIn"] = "fade_in";
    TransitionType["FadeOut"] = "fade_out";
    TransitionType["SmashCut"] = "smash_cut";
})(TransitionType || (exports.TransitionType = TransitionType = {}));
var ContinuityStrength;
(function (ContinuityStrength) {
    ContinuityStrength["Strong"] = "strong";
    ContinuityStrength["Medium"] = "medium";
    ContinuityStrength["Weak"] = "weak";
})(ContinuityStrength || (exports.ContinuityStrength = ContinuityStrength = {}));
//# sourceMappingURL=shot-type.js.map