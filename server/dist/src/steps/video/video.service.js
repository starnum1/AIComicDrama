"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma.service");
const video_gen_service_1 = require("../../providers/video-gen/video-gen.service");
const storage_service_1 = require("../../providers/storage/storage.service");
const ws_gateway_1 = require("../../common/ws.gateway");
const concurrency_1 = require("../../common/concurrency");
let VideoService = VideoService_1 = class VideoService {
    constructor(prisma, videoGen, storage, ws) {
        this.prisma = prisma;
        this.videoGen = videoGen;
        this.storage = storage;
        this.ws = ws;
        this.logger = new common_1.Logger(VideoService_1.name);
    }
    async execute(projectId) {
        const episodes = await this.prisma.episode.findMany({
            where: { projectId },
            include: {
                shots: {
                    include: { images: true },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        const taskFactories = [];
        for (const episode of episodes) {
            for (const shot of episode.shots) {
                taskFactories.push(() => this.generateForShot(shot.id));
            }
        }
        await (0, concurrency_1.executeBatch)(taskFactories, 3, (completed, total) => {
            this.ws.emitToProject(projectId, 'progress:detail', {
                step: 'video',
                message: `视频生成中 ${completed}/${total}`,
                completed,
                total,
            });
        });
        this.logger.log(`Project ${projectId} - 视频生成完成`);
    }
    async generateForShot(shotId) {
        const shot = await this.prisma.shot.findUnique({
            where: { id: shotId },
            include: {
                images: true,
                episode: true,
            },
        });
        if (!shot)
            throw new Error(`Shot ${shotId} not found`);
        const firstFrame = shot.images.find((img) => img.imageType === 'first_frame');
        const lastFrame = shot.images.find((img) => img.imageType === 'last_frame');
        if (!firstFrame) {
            throw new Error(`Shot ${shotId} missing first frame`);
        }
        let videoPrompt = shot.videoMotion;
        const dialogues = shot.dialogue;
        if (dialogues && dialogues.length > 0) {
            const dialogueText = dialogues.map((d) => `${d.speaker} says: "${d.text}"`).join('. ');
            videoPrompt += `. ${dialogueText}`;
        }
        const result = await this.videoGen.generateAndWait({
            firstFrameUrl: firstFrame.imageUrl,
            lastFrameUrl: lastFrame?.imageUrl,
            prompt: videoPrompt,
            duration: shot.duration,
        });
        if (result.status === 'failed') {
            throw new Error(`Video generation failed for shot ${shotId}`);
        }
        const storagePath = this.storage.generatePath(shot.episode.projectId, 'videos', 'mp4');
        const localUrl = await this.storage.uploadFromUrl(result.videoUrl, storagePath);
        await this.prisma.shotVideo.create({
            data: {
                shotId: shot.id,
                videoUrl: localUrl,
                actualDuration: shot.duration,
            },
        });
        this.ws.emitToProject(shot.episode.projectId, 'video:shot:complete', {
            shotId: shot.id,
            episodeId: shot.episodeId,
            videoUrl: localUrl,
        });
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = VideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        video_gen_service_1.VideoGenService,
        storage_service_1.StorageService,
        ws_gateway_1.WsGateway])
], VideoService);
//# sourceMappingURL=video.service.js.map