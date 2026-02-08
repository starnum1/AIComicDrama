import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { executeBatch } from '../../common/concurrency';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);

  constructor(
    private prisma: PrismaService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    const imageConfig = aiConfigs?.imageGen;
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

    // 收集所有镜头的生成任务（工厂函数，延迟执行）
    const taskFactories: Array<() => Promise<void>> = [];

    for (const episode of episodes) {
      for (const shot of episode.shots) {
        taskFactories.push(() => this.generateForShot(shot.id, imageConfig));
      }
    }

    // 控制并发执行（最多5个并发，避免API限流），使用公共并发工具
    await executeBatch(taskFactories, 5, (completed, total) => {
      this.ws.emitToProject(projectId, 'progress:detail', {
        step: 'anchor',
        message: `锚点生成中 ${completed}/${total}`,
        completed,
        total,
      });
    });

    this.logger.log(`Project ${projectId} - 视觉锚点生成完成`);
  }

  /**
   * 为单个镜头生成首帧和尾帧
   */
  async generateForShot(shotId: string, imageConfig?: AiProviderConfig): Promise<void> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: {
        characters: { include: { character: { include: { images: true } } } },
        scene: { include: { images: true } },
        episode: true,
      },
    });

    if (!shot) throw new Error(`Shot ${shotId} not found`);

    // 获取场景锚图（根据变体）
    const sceneImage =
      shot.scene.images.find((img) => img.variant === (shot.sceneVariant || 'default')) ||
      shot.scene.images.find((img) => img.variant === 'default');

    // 获取角色参考图
    const characterRefs = shot.characters
      .map((sc) => {
        const img = sc.character.images.find(
          (img) => img.imageType === 'front' && img.stateName === (sc.characterState || null),
        );
        return img?.imageUrl;
      })
      .filter(Boolean) as string[];

    // 根据景别选择参考策略
    const referenceImageUrl = this.selectReference(
      shot.shotType,
      sceneImage?.imageUrl,
      characterRefs,
    );
    const referenceStrength = this.getReferenceStrength(shot.shotType);

    // 生成首帧
    const firstFrameResult = await this.imageGen.generate({
      prompt: `${shot.imagePrompt}, first frame of scene, starting pose`,
      negativePrompt: shot.imageNegative,
      referenceImageUrl,
      referenceStrength,
      width: 1920,
      height: 1080,
    }, imageConfig);

    const firstFramePath = this.storage.generatePath(shot.episode.projectId, 'anchors', 'png');
    const firstFrameUrl = await this.storage.uploadFromUrl(
      firstFrameResult.imageUrl,
      firstFramePath,
    );

    await this.prisma.shotImage.create({
      data: {
        shotId: shot.id,
        imageType: 'first_frame',
        imageUrl: firstFrameUrl,
      },
    });

    // 生成尾帧
    const lastFrameResult = await this.imageGen.generate({
      prompt: `${shot.imagePrompt}, last frame of scene, ending pose, ${shot.videoMotion} completed`,
      negativePrompt: shot.imageNegative,
      referenceImageUrl,
      referenceStrength,
      width: 1920,
      height: 1080,
    }, imageConfig);

    const lastFramePath = this.storage.generatePath(shot.episode.projectId, 'anchors', 'png');
    const lastFrameUrl = await this.storage.uploadFromUrl(
      lastFrameResult.imageUrl,
      lastFramePath,
    );

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

  /**
   * 根据景别选择参考图策略
   */
  private selectReference(
    shotType: string,
    sceneImageUrl?: string,
    characterRefUrls?: string[],
  ): string | undefined {
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

  /**
   * 根据景别调整参考强度
   */
  private getReferenceStrength(shotType: string): number {
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
}
