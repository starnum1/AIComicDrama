import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PipelineOrchestrator } from '../pipeline/pipeline.orchestrator';
import { AssetService } from '../steps/asset/asset.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: PipelineOrchestrator,
    private assetService: AssetService,
    private aiProvidersService: AiProvidersService,
  ) {}

  // ==================== 项目 CRUD ====================

  /** 获取用户的项目列表 */
  async listProjects(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        currentStep: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** 创建新项目 */
  async createProject(userId: string, name: string) {
    return this.prisma.project.create({
      data: { userId, name },
    });
  }

  /** 获取项目详情 */
  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        novel: { select: { id: true, originalText: true, charCount: true, createdAt: true } },
        _count: {
          select: {
            characters: true,
            scenes: true,
            episodes: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问');

    return project;
  }

  /** 删除项目 */
  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');

    // 级联删除所有关联数据
    await this.prisma.$transaction(async (tx) => {
      // 删除任务
      await tx.task.deleteMany({ where: { projectId } });

      // 删除成片
      const episodes = await tx.episode.findMany({
        where: { projectId },
        select: { id: true },
      });
      const episodeIds = episodes.map((e) => e.id);

      if (episodeIds.length > 0) {
        await tx.finalVideo.deleteMany({
          where: { episodeId: { in: episodeIds } },
        });

        // 删除镜头相关
        const shots = await tx.shot.findMany({
          where: { episodeId: { in: episodeIds } },
          select: { id: true },
        });
        const shotIds = shots.map((s) => s.id);

        if (shotIds.length > 0) {
          await tx.shotVideo.deleteMany({
            where: { shotId: { in: shotIds } },
          });
          await tx.shotImage.deleteMany({
            where: { shotId: { in: shotIds } },
          });
          await tx.shotCharacter.deleteMany({
            where: { shotId: { in: shotIds } },
          });
          await tx.shot.deleteMany({
            where: { id: { in: shotIds } },
          });
        }

        await tx.episode.deleteMany({ where: { projectId } });
      }

      // 删除角色相关
      const characters = await tx.character.findMany({
        where: { projectId },
        select: { id: true },
      });
      const characterIds = characters.map((c) => c.id);

      if (characterIds.length > 0) {
        await tx.characterImage.deleteMany({
          where: { characterId: { in: characterIds } },
        });
        await tx.characterSheet.deleteMany({
          where: { characterId: { in: characterIds } },
        });
        await tx.character.deleteMany({ where: { projectId } });
      }

      // 删除场景相关
      const scenes = await tx.scene.findMany({
        where: { projectId },
        select: { id: true },
      });
      const sceneIds = scenes.map((s) => s.id);

      if (sceneIds.length > 0) {
        await tx.sceneImage.deleteMany({
          where: { sceneId: { in: sceneIds } },
        });
        await tx.scene.deleteMany({ where: { projectId } });
      }

      // 删除小说
      await tx.novel.deleteMany({ where: { projectId } });

      // 删除项目本身
      await tx.project.delete({ where: { id: projectId } });
    });

    return { success: true };
  }

  // ==================== AI 配置 ====================

  /** 更新项目的 AI 服务配置 */
  async updateAiConfig(
    userId: string,
    projectId: string,
    config: {
      llmProviderId?: string | null;
      imageProviderId?: string | null;
      videoProviderId?: string | null;
    },
  ) {
    await this.verifyProjectOwnership(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        llmProviderId: config.llmProviderId ?? null,
        imageProviderId: config.imageProviderId ?? null,
        videoProviderId: config.videoProviderId ?? null,
      },
      select: {
        id: true,
        llmProviderId: true,
        imageProviderId: true,
        videoProviderId: true,
      },
    });
  }

  // ==================== 小说上传 ====================

  /** 上传小说文本 */
  async uploadNovel(userId: string, projectId: string, text: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');

    // 删除已有小说（支持重新上传）
    await this.prisma.novel.deleteMany({ where: { projectId } });

    const novel = await this.prisma.novel.create({
      data: {
        projectId,
        originalText: text,
        charCount: text.length,
      },
    });

    return { id: novel.id, charCount: novel.charCount };
  }

  // ==================== 流水线控制 ====================

  /** 开始流水线 */
  async startPipeline(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { novel: true },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');
    if (!project.novel) {
      throw new BadRequestException('请先上传小说文本');
    }

    this.logger.log(`Starting pipeline for project ${projectId}`);
    await this.orchestrator.startFrom(projectId, 'asset');
    this.logger.log(`Pipeline task queued for project ${projectId}`);
    return { success: true, message: '流水线已启动' };
  }

  /** 确认资产，继续流水线（保留向后兼容） */
  async confirmAssets(userId: string, projectId: string) {
    return this.continueStep(userId, projectId);
  }

  /** 确认当前步骤结果，继续执行下一步（通用方法） */
  async continueStep(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');
    if (!project.status?.endsWith('_review')) {
      throw new BadRequestException('当前状态不需要确认');
    }

    await this.orchestrator.continueAfterReview(projectId);
    return { success: true, message: '已确认，继续执行下一步' };
  }

  /** 从指定步骤重跑 */
  async restartStep(userId: string, projectId: string, step: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作');

    await this.orchestrator.restartFrom(projectId, step as any);
    return { success: true, message: `从 ${step} 步骤重新开始` };
  }

  /** 重试单个镜头 */
  async retryShot(userId: string, shotId: string, step: string) {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: { episode: { include: { project: true } } },
    });
    if (!shot) throw new NotFoundException('镜头不存在');
    if (shot.episode.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    // TODO: 实现单镜头重试逻辑
    return { success: true, message: `镜头 ${shotId} 的 ${step} 步骤已重新提交` };
  }

  // ==================== 视觉资产 ====================

  /** 获取项目完整视觉资产（角色+场景+所有图片） */
  async getProjectAssets(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);

    const characters = await this.prisma.character.findMany({
      where: { projectId },
      include: {
        sheets: { orderBy: { createdAt: 'desc' } },
        images: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      include: {
        images: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { characters, scenes };
  }

  /** 获取项目角色设定图（兼容旧API） */
  async getCharacterSheets(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);
    return this.prisma.character.findMany({
      where: { projectId },
      include: {
        sheets: { orderBy: { createdAt: 'desc' } },
        images: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** 为单个角色生成定妆照 */
  async generateCharacterImage(
    userId: string,
    projectId: string,
    characterId: string,
    imageProviderId?: string,
  ) {
    await this.verifyProjectOwnership(userId, projectId);
    const imageConfig = await this.resolveImageConfig(userId, imageProviderId);
    return this.assetService.generateCharacterTurnaround(characterId, imageConfig);
  }

  /** 为单个场景生成锚图 */
  async generateSceneImage(
    userId: string,
    projectId: string,
    sceneId: string,
    variant: string,
    imageProviderId?: string,
  ) {
    await this.verifyProjectOwnership(userId, projectId);
    const imageConfig = await this.resolveImageConfig(userId, imageProviderId);
    return this.assetService.generateSceneAnchor(sceneId, variant, imageConfig);
  }

  /** 一键生成所有缺失的资产 */
  async generateAllAssets(
    userId: string,
    projectId: string,
    imageProviderId?: string,
  ) {
    await this.verifyProjectOwnership(userId, projectId);
    const imageConfig = await this.resolveImageConfig(userId, imageProviderId);
    return this.assetService.generateAllMissing(projectId, imageConfig);
  }

  /** 删除角色定妆照 */
  async deleteCharacterSheet(userId: string, sheetId: string) {
    const sheet = await this.prisma.characterSheet.findUnique({
      where: { id: sheetId },
      include: { character: { include: { project: true } } },
    });
    if (!sheet) throw new NotFoundException('定妆照不存在');
    if (sheet.character.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    await this.prisma.characterSheet.delete({ where: { id: sheetId } });
    return { success: true };
  }

  /** 删除场景锚图 */
  async deleteSceneImage(userId: string, imageId: string) {
    const image = await this.prisma.sceneImage.findUnique({
      where: { id: imageId },
      include: { scene: { include: { project: true } } },
    });
    if (!image) throw new NotFoundException('锚图不存在');
    if (image.scene.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    await this.prisma.sceneImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  /** 删除角色裁剪图（兼容旧API） */
  async deleteCharacterImage(userId: string, imageId: string) {
    const image = await this.prisma.characterImage.findUnique({
      where: { id: imageId },
      include: { character: { include: { project: true } } },
    });
    if (!image) throw new NotFoundException('图片不存在');
    if (image.character.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    await this.prisma.characterImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  /** 解析图片生成配置 */
  private async resolveImageConfig(userId: string, imageProviderId?: string) {
    if (!imageProviderId) return undefined;
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id: imageProviderId },
    });
    if (!provider || provider.userId !== userId) return undefined;
    return {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
    };
  }

  // ==================== 数据查询 ====================

  /** 获取分集列表 */
  async getEpisodes(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);

    return this.prisma.episode.findMany({
      where: { projectId },
      orderBy: { episodeNumber: 'asc' },
      include: {
        _count: { select: { shots: true } },
        finalVideo: { select: { id: true, videoUrl: true, duration: true } },
      },
    });
  }

  /** 修改集信息 */
  async updateEpisode(
    userId: string,
    episodeId: string,
    data: { title?: string; summary?: string },
  ) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { project: true },
    });
    if (!episode) throw new NotFoundException('集不存在');
    if (episode.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    return this.prisma.episode.update({
      where: { id: episodeId },
      data,
    });
  }

  /** 获取角色列表 */
  async getCharacters(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);

    return this.prisma.character.findMany({
      where: { projectId },
      include: {
        sheets: true,
        images: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** 获取场景列表 */
  async getScenes(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);

    return this.prisma.scene.findMany({
      where: { projectId },
      include: { images: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** 获取某集的分镜列表 */
  async getShots(userId: string, episodeId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { project: true },
    });
    if (!episode) throw new NotFoundException('集不存在');
    if (episode.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    return this.prisma.shot.findMany({
      where: { episodeId },
      orderBy: { shotNumber: 'asc' },
      include: {
        characters: { include: { character: true } },
        images: true,
        video: true,
        scene: { select: { id: true, name: true } },
      },
    });
  }

  /** 修改镜头信息 */
  async updateShot(
    userId: string,
    shotId: string,
    data: {
      imagePrompt?: string;
      duration?: number;
      shotType?: string;
      cameraMovement?: string;
    },
  ) {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: { episode: { include: { project: true } } },
    });
    if (!shot) throw new NotFoundException('镜头不存在');
    if (shot.episode.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    return this.prisma.shot.update({
      where: { id: shotId },
      data,
    });
  }

  /** 获取某集的成片 */
  async getFinalVideo(userId: string, episodeId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { project: true },
    });
    if (!episode) throw new NotFoundException('集不存在');
    if (episode.project.userId !== userId)
      throw new ForbiddenException('无权操作');

    const video = await this.prisma.finalVideo.findUnique({
      where: { episodeId },
    });
    if (!video) throw new NotFoundException('成片尚未生成');

    return video;
  }

  // ==================== 辅助方法 ====================

  private async verifyProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问');
    return project;
  }
}
