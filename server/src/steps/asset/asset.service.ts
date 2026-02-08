import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { executeBatch } from '../../common/concurrency';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

// LLM 提取结果：角色 + 场景
interface ExtractResult {
  characters: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    states?: Record<string, string>;
  }[];
  scenes: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    variants?: Record<string, string>;
  }[];
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    // ========== Phase 1：LLM 提取角色 + 场景 ==========
    const novel = await this.prisma.novel.findUnique({ where: { projectId } });
    if (!novel) throw new Error('小说内容不存在');

    this.logger.log(`Project ${projectId} - 开始视觉资产构建，字数：${novel.charCount}`);

    this.ws.emitToProject(projectId, 'progress:detail', {
      step: 'asset',
      message: '正在分析角色和场景...',
      completed: 0,
      total: 0,
    });

    const { data: extractResult } = await this.llm.chatJSON<ExtractResult>(
      [
        { role: 'system', content: this.buildExtractSystemPrompt() },
        {
          role: 'user',
          content: `请分析以下短篇小说，提取所有角色和场景：\n\n${novel.originalText}`,
        },
      ],
      { temperature: 0.7, maxTokens: 8000 },
      aiConfigs?.llm,
    );

    // 存储角色
    for (let i = 0; i < extractResult.characters.length; i++) {
      const char = extractResult.characters[i];
      await this.prisma.character.create({
        data: {
          projectId,
          name: char.name,
          description: char.description,
          visualPrompt: char.visual_prompt,
          visualNegative: char.visual_negative,
          states: char.states ?? Prisma.JsonNull,
          episodeIds: [],
          sortOrder: i,
        },
      });
    }

    // 存储场景
    for (let i = 0; i < extractResult.scenes.length; i++) {
      const scene = extractResult.scenes[i];
      await this.prisma.scene.create({
        data: {
          projectId,
          name: scene.name,
          description: scene.description,
          visualPrompt: scene.visual_prompt,
          visualNegative: scene.visual_negative,
          variants: scene.variants ?? Prisma.JsonNull,
          episodeIds: [],
          sortOrder: i,
        },
      });
    }

    this.logger.log(
      `Project ${projectId} - 提取完成：${extractResult.characters.length}个角色，${extractResult.scenes.length}个场景`,
    );

    // ========== Phase 2：生成设定图和场景图 ==========
    const imageConfig = aiConfigs?.imageGen;
    const characters = await this.prisma.character.findMany({ where: { projectId } });
    const scenes = await this.prisma.scene.findMany({ where: { projectId } });

    const totalAssets = characters.length + scenes.length;
    let completedAssets = 0;

    const taskFactories: Array<() => Promise<void>> = [];

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

    await executeBatch(taskFactories, 5);

    this.logger.log(
      `Project ${projectId} - 视觉资产生成完成（${characters.length}角色 + ${scenes.length}场景）`,
    );
  }

  // ==================== LLM 提取提示词 ====================

  private buildExtractSystemPrompt(): string {
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

  // ==================== 角色设定图生成 ====================

  private async generateCharacterSheet(
    projectId: string,
    character: any,
    imageConfig?: AiProviderConfig,
  ): Promise<void> {
    await this.generateSingleSheet(projectId, character, null, imageConfig);

    const states = character.states as Record<string, string> | null;
    if (states) {
      for (const [stateName, statePrompt] of Object.entries(states)) {
        const stateCharacter = { ...character, visualPrompt: statePrompt };
        await this.generateSingleSheet(projectId, stateCharacter, stateName, imageConfig);
      }
    }
  }

  private async generateSingleSheet(
    projectId: string,
    character: any,
    stateName: string | null,
    imageConfig?: AiProviderConfig,
  ): Promise<void> {
    const prompt = this.buildCharacterSheetPrompt(character.visualPrompt);

    const result = await this.imageGen.generate(
      {
        prompt,
        negativePrompt: `${character.visualNegative}, single view, single pose, cropped, partial body`,
        width: 1536,
        height: 1536,
      },
      imageConfig,
    );

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

  private buildCharacterSheetPrompt(visualPrompt: string): string {
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

  // ==================== 用户裁剪（由 API 路由调用，非流水线步骤） ====================

  async cropFromSheet(
    sheetId: string,
    imageType: string,
    cropRegion: { x: number; y: number; width: number; height: number },
  ): Promise<{ id: string; imageUrl: string }> {
    const sheet = await this.prisma.characterSheet.findUnique({
      where: { id: sheetId },
      include: { character: true },
    });

    if (!sheet) throw new Error(`CharacterSheet ${sheetId} not found`);

    const response = await fetch(sheet.imageUrl);
    const sheetBuffer = Buffer.from(await response.arrayBuffer());

    const sharp = (await import('sharp')).default;
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
        cropRegion: cropRegion as any,
        stateName: sheet.stateName,
      },
    });

    return { id: created.id, imageUrl: croppedUrl };
  }

  async regenerateCharacterSheet(sheetId: string): Promise<void> {
    const sheet = await this.prisma.characterSheet.findUnique({
      where: { id: sheetId },
      include: { character: true },
    });

    if (!sheet) throw new Error(`CharacterSheet ${sheetId} not found`);

    const character = sheet.character;
    const projectId = character.projectId;

    await this.prisma.characterImage.deleteMany({ where: { sheetId: sheet.id } });
    await this.prisma.characterSheet.delete({ where: { id: sheet.id } });

    if (sheet.stateName) {
      const states = character.states as Record<string, string> | null;
      const statePrompt = states?.[sheet.stateName] || character.visualPrompt;
      const stateCharacter = { ...character, visualPrompt: statePrompt };
      await this.generateSingleSheet(projectId, stateCharacter, sheet.stateName);
    } else {
      await this.generateSingleSheet(projectId, character, null);
    }
  }

  // ==================== 场景锚图生成 ====================

  private async generateSceneImages(
    projectId: string,
    scene: any,
    imageConfig?: AiProviderConfig,
  ): Promise<void> {
    const defaultPrompt = `${scene.visualPrompt}, wide shot, establishing shot, full environment view, 16:9 aspect ratio, high quality, detailed background`;

    const defaultResult = await this.imageGen.generate(
      {
        prompt: defaultPrompt,
        negativePrompt: scene.visualNegative,
        width: 1920,
        height: 1080,
      },
      imageConfig,
    );

    const defaultPath = this.storage.generatePath(projectId, 'scenes', 'png');
    const defaultUrl = await this.storage.uploadFromUrl(defaultResult.imageUrl, defaultPath);

    await this.prisma.sceneImage.create({
      data: { sceneId: scene.id, variant: 'default', imageUrl: defaultUrl },
    });

    const variants = scene.variants as Record<string, string> | null;
    if (variants) {
      for (const [variantName, variantDesc] of Object.entries(variants)) {
        const variantPrompt = `${scene.visualPrompt}, ${variantDesc}, wide shot, establishing shot, 16:9, high quality`;

        const variantResult = await this.imageGen.generate(
          {
            prompt: variantPrompt,
            negativePrompt: scene.visualNegative,
            referenceImageUrl: defaultUrl,
            referenceStrength: 0.7,
            width: 1920,
            height: 1080,
          },
          imageConfig,
        );

        const variantPath = this.storage.generatePath(projectId, 'scenes', 'png');
        const variantUrl = await this.storage.uploadFromUrl(variantResult.imageUrl, variantPath);

        await this.prisma.sceneImage.create({
          data: { sceneId: scene.id, variant: variantName, imageUrl: variantUrl },
        });
      }
    }

    this.ws.emitToProject(projectId, 'asset:scene:complete', { sceneId: scene.id });
  }
}
