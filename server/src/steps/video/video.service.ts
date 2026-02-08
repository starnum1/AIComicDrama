import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { VideoGenService } from '../../providers/video-gen/video-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { executeBatch } from '../../common/concurrency';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private videoGen: VideoGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    const videoConfig = aiConfigs?.videoGen;
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

    // 收集所有镜头的生成任务（工厂函数，延迟执行）
    const taskFactories: Array<() => Promise<void>> = [];

    for (const episode of episodes) {
      for (const shot of episode.shots) {
        taskFactories.push(() => this.generateForShot(shot.id, videoConfig));
      }
    }

    // 控制并发（视频生成API通常有严格的并发限制），使用公共并发工具
    await executeBatch(taskFactories, 3, (completed, total) => {
      this.ws.emitToProject(projectId, 'progress:detail', {
        step: 'video',
        message: `视频生成中 ${completed}/${total}`,
        completed,
        total,
      });
    });

    this.logger.log(`Project ${projectId} - 视频生成完成`);
  }

  /**
   * 为单个镜头生成视频
   */
  async generateForShot(shotId: string, videoConfig?: AiProviderConfig): Promise<void> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: {
        images: true,
        episode: true,
      },
    });

    if (!shot) throw new Error(`Shot ${shotId} not found`);

    const firstFrame = shot.images.find((img) => img.imageType === 'first_frame');
    const lastFrame = shot.images.find((img) => img.imageType === 'last_frame');

    if (!firstFrame) {
      throw new Error(`Shot ${shotId} missing first frame`);
    }

    // 构建视频生成的prompt
    let videoPrompt = shot.videoMotion;

    // 如果有对话，加入对话内容让视频模型生成音画同步的效果
    const dialogues = shot.dialogue as any[] | null;
    if (dialogues && dialogues.length > 0) {
      const dialogueText = dialogues.map((d) => `${d.speaker} says: "${d.text}"`).join('. ');
      videoPrompt += `. ${dialogueText}`;
    }

    // 调用视频生成API
    const result = await this.videoGen.generateAndWait(
      {
        firstFrameUrl: firstFrame.imageUrl,
        lastFrameUrl: lastFrame?.imageUrl,
        prompt: videoPrompt,
        duration: shot.duration,
      },
      videoConfig,
    );

    if (result.status === 'failed') {
      throw new Error(`Video generation failed for shot ${shotId}`);
    }

    // 下载并存储视频
    const storagePath = this.storage.generatePath(shot.episode.projectId, 'videos', 'mp4');
    const localUrl = await this.storage.uploadFromUrl(result.videoUrl!, storagePath);

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
}
