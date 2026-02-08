import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { executeBatch } from '../../common/concurrency';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private prisma: PrismaService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    const imageConfig = aiConfigs?.imageGen;
    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });
    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
    });

    const totalAssets = characters.length + scenes.length;
    let completedAssets = 0;

    // 使用 executeBatch 控制并发（避免 Promise.all 无限并发触发限流）
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

    // 最多 5 个并发
    await executeBatch(taskFactories, 5);

    this.logger.log(
      `Project ${projectId} - 视觉资产生成完成（设定图已生成，等待用户裁剪确认）`,
    );
  }

  // ==================== 角色设定图生成 ====================

  private async generateCharacterSheet(
    projectId: string,
    character: any,
    imageConfig?: AiProviderConfig,
  ): Promise<void> {
    // 默认状态的设定图
    await this.generateSingleSheet(projectId, character, null, imageConfig);

    // 如果有状态变体（如鬼魂状态），为每个变体生成独立的设定图
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

    const result = await this.imageGen.generate({
      prompt,
      negativePrompt: `${character.visualNegative}, single view, single pose, cropped, partial body`,
      width: 1536,
      height: 1536,
    }, imageConfig);

    // 下载并存储完整设定图
    const storagePath = this.storage.generatePath(projectId, 'character-sheets', 'png');
    const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);

    // 存储设定图记录
    await this.prisma.characterSheet.create({
      data: {
        characterId: character.id,
        imageUrl: localUrl,
        stateName,
        gridSpec: '3x3',
      },
    });

    // 通知前端：设定图已生成
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

    // 1. 下载设定图原图
    const response = await fetch(sheet.imageUrl);
    const sheetBuffer = Buffer.from(await response.arrayBuffer());

    // 2. 使用 sharp 裁剪指定区域
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

    // 3. 上传裁剪后的图片
    const projectId = sheet.character.projectId;
    const storagePath = this.storage.generatePath(projectId, 'characters', 'png');
    const croppedUrl = await this.storage.uploadBuffer(croppedBuffer, storagePath, 'image/png');

    // 4. 存储裁剪记录
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

    // 删除旧设定图的裁剪子图
    await this.prisma.characterImage.deleteMany({
      where: { sheetId: sheet.id },
    });

    // 删除旧设定图
    await this.prisma.characterSheet.delete({
      where: { id: sheet.id },
    });

    // 重新生成
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

    // 生成氛围变体
    const variants = scene.variants as Record<string, string> | null;
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
}
