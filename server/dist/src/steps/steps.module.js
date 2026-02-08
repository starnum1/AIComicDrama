"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepsModule = void 0;
const common_1 = require("@nestjs/common");
const asset_service_1 = require("./asset/asset.service");
const episode_service_1 = require("./episode/episode.service");
const storyboard_service_1 = require("./storyboard/storyboard.service");
const anchor_service_1 = require("./anchor/anchor.service");
const video_service_1 = require("./video/video.service");
const assembly_service_1 = require("./assembly/assembly.service");
let StepsModule = class StepsModule {
};
exports.StepsModule = StepsModule;
exports.StepsModule = StepsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            asset_service_1.AssetService,
            episode_service_1.EpisodeService,
            storyboard_service_1.StoryboardService,
            anchor_service_1.AnchorService,
            video_service_1.VideoService,
            assembly_service_1.AssemblyService,
        ],
        exports: [
            asset_service_1.AssetService,
            episode_service_1.EpisodeService,
            storyboard_service_1.StoryboardService,
            anchor_service_1.AnchorService,
            video_service_1.VideoService,
            assembly_service_1.AssemblyService,
        ],
    })
], StepsModule);
//# sourceMappingURL=steps.module.js.map