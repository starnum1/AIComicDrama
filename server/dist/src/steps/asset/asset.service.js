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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma.service");
const llm_service_1 = require("../../providers/llm/llm.service");
const image_gen_service_1 = require("../../providers/image-gen/image-gen.service");
const storage_service_1 = require("../../providers/storage/storage.service");
const ws_gateway_1 = require("../../common/ws.gateway");
const concurrency_1 = require("../../common/concurrency");
let AssetService = AssetService_1 = class AssetService {
    constructor(prisma, llm, imageGen, storage, ws) {
        this.prisma = prisma;
        this.llm = llm;
        this.imageGen = imageGen;
        this.storage = storage;
        this.ws = ws;
        this.logger = new common_1.Logger(AssetService_1.name);
    }
    async execute(projectId, aiConfigs) {
        const novel = await this.prisma.novel.findUnique({ where: { projectId } });
        if (!novel)
            throw new Error('小说内容不存在');
        this.logger.log(`Project ${projectId} - 开始视觉资产构建，字数：${novel.charCount}`);
        this.ws.emitToProject(projectId, 'progress:detail', {
            step: 'asset',
            message: '正在分析角色和场景...',
            completed: 0,
            total: 0,
        });
        const { data: extractResult } = await this.llm.chatJSON([
            { role: 'system', content: this.buildExtractSystemPrompt() },
            {
                role: 'user',
                content: `请分析以下短篇小说，提取所有角色和场景：\n\n${novel.originalText}`,
            },
        ], { temperature: 0.7, maxTokens: 8000 }, aiConfigs?.llm);
        for (let i = 0; i < extractResult.characters.length; i++) {
            const char = extractResult.characters[i];
            await this.prisma.character.create({
                data: {
                    projectId,
                    name: char.name,
                    description: char.description,
                    visualPrompt: char.visual_prompt,
                    visualNegative: char.visual_negative,
                    states: char.states ?? client_1.Prisma.JsonNull,
                    episodeIds: [],
                    sortOrder: i,
                },
            });
        }
        for (let i = 0; i < extractResult.scenes.length; i++) {
            const scene = extractResult.scenes[i];
            await this.prisma.scene.create({
                data: {
                    projectId,
                    name: scene.name,
                    description: scene.description,
                    visualPrompt: scene.visual_prompt,
                    visualNegative: scene.visual_negative,
                    variants: scene.variants ?? client_1.Prisma.JsonNull,
                    episodeIds: [],
                    sortOrder: i,
                },
            });
        }
        this.logger.log(`Project ${projectId} - 提取完成：${extractResult.characters.length}个角色，${extractResult.scenes.length}个场景`);
        const imageConfig = aiConfigs?.imageGen;
        const characters = await this.prisma.character.findMany({ where: { projectId } });
        const scenes = await this.prisma.scene.findMany({ where: { projectId } });
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
        this.logger.log(`Project ${projectId} - 视觉资产生成完成（${characters.length}角色 + ${scenes.length}场景）`);
    }
    buildExtractSystemPrompt() {
        return `你是一位专业的3D动漫短剧策划师。你的任务是分析一篇短篇小说，提取所有角色和场景。

## 角色提取要求

- 识别所有有台词或重要戏份的角色
- 为每个角色生成完整的英文视觉描述（visual_prompt），用于AI图像生成
- 视觉描述必须包含：性别、年龄、体型、发型发色、面部特征、服装、整体风格
- 所有视觉描述统一使用以下基础风格前缀：3d anime style, cel-shading, cinematic lighting
- 小说中未明确描写的外貌，根据角色身份、性格、年代背景合理补充
- 如果角色在故事中有明显的状态变化（如生/死、变装、受伤），在states字段中为每种状态分别提供视觉描述
- visual_negative 用于排除不想要的风格元素，通常包含：realistic, photographic, western, modern（根据作品年代调整）

## 场景提取要求

- 识别所有出现的场景/地点
- 为每个场景生成完整的英文视觉描述（visual_prompt）
- 必须包含：场景类型（室内/室外）、空间布局、关键物件、光照条件、整体氛围
- 同样使用 3d anime style 前缀
- 如果同一场景在不同时段/天气下出现，在variants字段中提供变体描述
- 变体只改变光照和氛围，不改变空间布局和物件位置

## 输出格式

严格按照JSON格式输出，不要包含任何其他文字：

{
  "characters": [
    {
      "name": "角色中文名",
      "description": "角色简介（中文，2-3句话，包含性格和角色功能）",
      "visual_prompt": "3d anime style, cel-shading, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ... (英文负面提示词)",
      "states": {"状态名": "该状态下的完整英文视觉描述"} 或 null
    }
  ],
  "scenes": [
    {
      "name": "场景中文名",
      "description": "场景简介（中文）",
      "visual_prompt": "3d anime style, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ...",
      "variants": {"night": "夜晚变体描述", "storm": "暴风雨变体描述"} 或 null
    }
  ]
}`;
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
        await this.prisma.characterImage.deleteMany({ where: { sheetId: sheet.id } });
        await this.prisma.characterSheet.delete({ where: { id: sheet.id } });
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
            data: { sceneId: scene.id, variant: 'default', imageUrl: defaultUrl },
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
                    data: { sceneId: scene.id, variant: variantName, imageUrl: variantUrl },
                });
            }
        }
        this.ws.emitToProject(projectId, 'asset:scene:complete', { sceneId: scene.id });
    }
};
exports.AssetService = AssetService;
exports.AssetService = AssetService = AssetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        llm_service_1.LLMService,
        image_gen_service_1.ImageGenService,
        storage_service_1.StorageService,
        ws_gateway_1.WsGateway])
], AssetService);
//# sourceMappingURL=asset.service.js.map