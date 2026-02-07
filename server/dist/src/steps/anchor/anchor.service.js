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
var AnchorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnchorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma.service");
const image_gen_service_1 = require("../../providers/image-gen/image-gen.service");
const storage_service_1 = require("../../providers/storage/storage.service");
const ws_gateway_1 = require("../../common/ws.gateway");
const concurrency_1 = require("../../common/concurrency");
let AnchorService = AnchorService_1 = class AnchorService {
    constructor(prisma, imageGen, storage, ws) {
        this.prisma = prisma;
        this.imageGen = imageGen;
        this.storage = storage;
        this.ws = ws;
        this.logger = new common_1.Logger(AnchorService_1.name);
    }
    async execute(projectId) {
        const episodes = await this.prisma.episode.findMany({
            where: { projectId },
            include: {
                shots: {
                    include: {
                        characters: { include: { character: { include: { images: true } } } },
                        scene: { include: { images: true } },
                    },
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
        await (0, concurrency_1.executeBatch)(taskFactories, 5, (completed, total) => {
            this.ws.emitToProject(projectId, 'progress:detail', {
                step: 'anchor',
                message: `锚点生成中 ${completed}/${total}`,
                completed,
                total,
            });
        });
        this.logger.log(`Project ${projectId} - 视觉锚点生成完成`);
    }
    async generateForShot(shotId) {
        const shot = await this.prisma.shot.findUnique({
            where: { id: shotId },
            include: {
                characters: { include: { character: { include: { images: true } } } },
                scene: { include: { images: true } },
                episode: true,
            },
        });
        if (!shot)
            throw new Error(`Shot ${shotId} not found`);
        const sceneImage = shot.scene.images.find((img) => img.variant === (shot.sceneVariant || 'default')) ||
            shot.scene.images.find((img) => img.variant === 'default');
        const characterRefs = shot.characters
            .map((sc) => {
            const img = sc.character.images.find((img) => img.imageType === 'front' && img.stateName === (sc.characterState || null));
            return img?.imageUrl;
        })
            .filter(Boolean);
        const referenceImageUrl = this.selectReference(shot.shotType, sceneImage?.imageUrl, characterRefs);
        const referenceStrength = this.getReferenceStrength(shot.shotType);
        const firstFrameResult = await this.imageGen.generate({
            prompt: `${shot.imagePrompt}, first frame of scene, starting pose`,
            negativePrompt: shot.imageNegative,
            referenceImageUrl,
            referenceStrength,
            width: 1920,
            height: 1080,
        });
        const firstFramePath = this.storage.generatePath(shot.episode.projectId, 'anchors', 'png');
        const firstFrameUrl = await this.storage.uploadFromUrl(firstFrameResult.imageUrl, firstFramePath);
        await this.prisma.shotImage.create({
            data: {
                shotId: shot.id,
                imageType: 'first_frame',
                imageUrl: firstFrameUrl,
            },
        });
        const lastFrameResult = await this.imageGen.generate({
            prompt: `${shot.imagePrompt}, last frame of scene, ending pose, ${shot.videoMotion} completed`,
            negativePrompt: shot.imageNegative,
            referenceImageUrl,
            referenceStrength,
            width: 1920,
            height: 1080,
        });
        const lastFramePath = this.storage.generatePath(shot.episode.projectId, 'anchors', 'png');
        const lastFrameUrl = await this.storage.uploadFromUrl(lastFrameResult.imageUrl, lastFramePath);
        await this.prisma.shotImage.create({
            data: {
                shotId: shot.id,
                imageType: 'last_frame',
                imageUrl: lastFrameUrl,
            },
        });
        this.ws.emitToProject(shot.episode.projectId, 'anchor:shot:complete', {
            shotId: shot.id,
            firstFrameUrl,
            lastFrameUrl,
        });
    }
    selectReference(shotType, sceneImageUrl, characterRefUrls) {
        switch (shotType) {
            case 'wide':
            case 'high_angle':
                return sceneImageUrl;
            case 'medium':
            case 'over_shoulder':
                return sceneImageUrl;
            case 'close_up':
            case 'extreme_close_up':
                return characterRefUrls?.[0] || sceneImageUrl;
            default:
                return sceneImageUrl;
        }
    }
    getReferenceStrength(shotType) {
        switch (shotType) {
            case 'wide':
                return 0.75;
            case 'medium':
                return 0.6;
            case 'close_up':
            case 'extreme_close_up':
                return 0.5;
            default:
                return 0.6;
        }
    }
};
exports.AnchorService = AnchorService;
exports.AnchorService = AnchorService = AnchorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        image_gen_service_1.ImageGenService,
        storage_service_1.StorageService,
        ws_gateway_1.WsGateway])
], AnchorService);
//# sourceMappingURL=anchor.service.js.map