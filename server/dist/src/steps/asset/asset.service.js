"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma.service");
const image_gen_service_1 = require("../../providers/image-gen/image-gen.service");
const storage_service_1 = require("../../providers/storage/storage.service");
const ws_gateway_1 = require("../../common/ws.gateway");
const concurrency_1 = require("../../common/concurrency");
let AssetService = AssetService_1 = class AssetService {
    constructor(prisma, imageGen, storage, ws) {
        this.prisma = prisma;
        this.imageGen = imageGen;
        this.storage = storage;
        this.ws = ws;
        this.logger = new common_1.Logger(AssetService_1.name);
    }
    async execute(projectId, aiConfigs) {
        const imageConfig = aiConfigs?.imageGen;
        const characters = await this.prisma.character.findMany({
            where: { projectId },
        });
        const scenes = await this.prisma.scene.findMany({
            where: { projectId },
        });
        const totalAssets = characters.length + scenes.length;
        let completedAssets = 0;
        const taskFactories = [];
        for (const character of characters) {
            taskFactories.push(async () => {
                await this.generateCharacterSheet(projectId, character, imageConfig);
                completedAssets++;
                this.ws.emitToProject(projectId, 'progress:detail', {
                    step: 'asset',
                    message: `视觉资产生成中 ${completedAssets}/${totalAssets}（角色设定图：${character.name}）`,
                    completed: completedAssets,
                    total: totalAssets,
                    entityType: 'character',
                    entityId: character.id,
                });
            });
        }
        for (const scene of scenes) {
            taskFactories.push(async () => {
                await this.generateSceneImages(projectId, scene, imageConfig);
                completedAssets++;
                this.ws.emitToProject(projectId, 'progress:detail', {
                    step: 'asset',
                    message: `视觉资产生成中 ${completedAssets}/${totalAssets}（场景：${scene.name}）`,
                    completed: completedAssets,
                    total: totalAssets,
                    entityType: 'scene',
                    entityId: scene.id,
                });
            });
        }
        await (0, concurrency_1.executeBatch)(taskFactories, 5);
        this.logger.log(`Project ${projectId} - 视觉资产生成完成（设定图已生成，等待用户裁剪确认）`);
    }
    async generateCharacterSheet(projectId, character, imageConfig) {
        await this.generateSingleSheet(projectId, character, null, imageConfig);
        const states = character.states;
        if (states) {
            for (const [stateName, statePrompt] of Object.entries(states)) {
                const stateCharacter = { ...character, visualPrompt: statePrompt };
                await this.generateSingleSheet(projectId, stateCharacter, stateName, imageConfig);
            }
        }
    }
    async generateSingleSheet(projectId, character, stateName, imageConfig) {
        const prompt = this.buildCharacterSheetPrompt(character.visualPrompt);
        const result = await this.imageGen.generate({
            prompt,
            negativePrompt: `${character.visualNegative}, single view, single pose, cropped, partial body`,
            width: 1536,
            height: 1536,
        }, imageConfig);
        const storagePath = this.storage.generatePath(projectId, 'character-sheets', 'png');
        const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);
        await this.prisma.characterSheet.create({
            data: {
                characterId: character.id,
                imageUrl: localUrl,
                stateName,
                gridSpec: '3x3',
            },
        });
        this.ws.emitToProject(projectId, 'asset:character:sheet', {
            characterId: character.id,
            sheetUrl: localUrl,
            stateName,
        });
    }
    buildCharacterSheetPrompt(visualPrompt) {
        return [
            visualPrompt,
            'character reference sheet',
            '3x3 grid layout',
            'multiple views and expressions on white background',
            'top row: front full body view, 3/4 angle full body view, side profile full body view',
            'middle row: back view upper body, close-up happy expression, close-up angry expression',
            'bottom row: close-up sad expression, close-up surprised expression, close-up neutral expression',
            'consistent character design across all views',
            'clean white background',
            'high quality, detailed, professional character sheet',
        ].join(', ');
    }
    async cropFromSheet(sheetId, imageType, cropRegion) {
        const sheet = await this.prisma.characterSheet.findUnique({
            where: { id: sheetId },
            include: { character: true },
        });
        if (!sheet)
            throw new Error(`CharacterSheet ${sheetId} not found`);
        const response = await fetch(sheet.imageUrl);
        const sheetBuffer = Buffer.from(await response.arrayBuffer());
        const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
        const croppedBuffer = await sharp(sheetBuffer)
            .extract({
            left: Math.round(cropRegion.x),
            top: Math.round(cropRegion.y),
            width: Math.round(cropRegion.width),
            height: Math.round(cropRegion.height),
        })
            .png()
            .toBuffer();
        const projectId = sheet.character.projectId;
        const storagePath = this.storage.generatePath(projectId, 'characters', 'png');
        const croppedUrl = await this.storage.uploadBuffer(croppedBuffer, storagePath, 'image/png');
        const created = await this.prisma.characterImage.create({
            data: {
                characterId: sheet.characterId,
                sheetId: sheet.id,
                imageType,
                imageUrl: croppedUrl,
                cropRegion: cropRegion,
                stateName: sheet.stateName,
            },
        });
        return { id: created.id, imageUrl: croppedUrl };
    }
    async regenerateCharacterSheet(sheetId) {
        const sheet = await this.prisma.characterSheet.findUnique({
            where: { id: sheetId },
            include: { character: true },
        });
        if (!sheet)
            throw new Error(`CharacterSheet ${sheetId} not found`);
        const character = sheet.character;
        const projectId = character.projectId;
        await this.prisma.characterImage.deleteMany({
            where: { sheetId: sheet.id },
        });
        await this.prisma.characterSheet.delete({
            where: { id: sheet.id },
        });
        if (sheet.stateName) {
            const states = character.states;
            const statePrompt = states?.[sheet.stateName] || character.visualPrompt;
            const stateCharacter = { ...character, visualPrompt: statePrompt };
            await this.generateSingleSheet(projectId, stateCharacter, sheet.stateName);
        }
        else {
            await this.generateSingleSheet(projectId, character, null);
        }
    }
    async generateSceneImages(projectId, scene, imageConfig) {
        const defaultPrompt = `${scene.visualPrompt}, wide shot, establishing shot, full environment view, 16:9 aspect ratio, high quality, detailed background`;
        const defaultResult = await this.imageGen.generate({
            prompt: defaultPrompt,
            negativePrompt: scene.visualNegative,
            width: 1920,
            height: 1080,
        }, imageConfig);
        const defaultPath = this.storage.generatePath(projectId, 'scenes', 'png');
        const defaultUrl = await this.storage.uploadFromUrl(defaultResult.imageUrl, defaultPath);
        await this.prisma.sceneImage.create({
            data: {
                sceneId: scene.id,
                variant: 'default',
                imageUrl: defaultUrl,
            },
        });
        const variants = scene.variants;
        if (variants) {
            for (const [variantName, variantDesc] of Object.entries(variants)) {
                const variantPrompt = `${scene.visualPrompt}, ${variantDesc}, wide shot, establishing shot, 16:9, high quality`;
                const variantResult = await this.imageGen.generate({
                    prompt: variantPrompt,
                    negativePrompt: scene.visualNegative,
                    referenceImageUrl: defaultUrl,
                    referenceStrength: 0.7,
                    width: 1920,
                    height: 1080,
                }, imageConfig);
                const variantPath = this.storage.generatePath(projectId, 'scenes', 'png');
                const variantUrl = await this.storage.uploadFromUrl(variantResult.imageUrl, variantPath);
                await this.prisma.sceneImage.create({
                    data: {
                        sceneId: scene.id,
                        variant: variantName,
                        imageUrl: variantUrl,
                    },
                });
            }
        }
        this.ws.emitToProject(projectId, 'asset:scene:complete', {
            sceneId: scene.id,
        });
    }
};
exports.AssetService = AssetService;
exports.AssetService = AssetService = AssetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        image_gen_service_1.ImageGenService,
        storage_service_1.StorageService,
        ws_gateway_1.WsGateway])
], AssetService);
//# sourceMappingURL=asset.service.js.map