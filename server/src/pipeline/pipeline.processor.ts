import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { AnalysisService } from '../steps/analysis/analysis.service';
import { AssetService } from '../steps/asset/asset.service';
import { StoryboardService } from '../steps/storyboard/storyboard.service';
import { AnchorService } from '../steps/anchor/anchor.service';
import { VideoService } from '../steps/video/video.service';
import { AssemblyService } from '../steps/assembly/assembly.service';
import { WsGateway } from '../common/ws.gateway';
import { PipelineOrchestrator, PipelineJobData } from './pipeline.orchestrator';
import { PipelineStep, PIPELINE_REVIEW_STEPS } from '@aicomic/shared';

@Processor('pipeline', {
  concurrency: 2,
})
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: PipelineOrchestrator,
    private analysisService: AnalysisService,
    private assetService: AssetService,
    private storyboardService: StoryboardService,
    private anchorService: AnchorService,
    private videoService: VideoService,
    private assemblyService: AssemblyService,
    private ws: WsGateway,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { projectId, step } = job.data;

    this.logger.log(
      `Processing: Project ${projectId} - Step ${step} (attempt ${job.attemptsMade + 1})`,
    );

    // 更新项目状态
    await this.prisma.project.update({
      where: { id: projectId },
      data: { currentStep: step, status: `${step}_processing` },
    });
    this.ws.emitToProject(projectId, 'step:start', { step });

    try {
      // ========== 幂等性保障：执行前清理该步骤已有的输出数据 ==========
      await this.clearStepOutput(projectId, step);

      // 执行实际的 AI 任务
      await this.executeStep(projectId, step);

      // 通知前端步骤完成
      this.ws.emitToProject(projectId, 'step:complete', { step });
      this.logger.log(`Completed: Project ${projectId} - Step ${step}`);

      // 需要用户确认的步骤，暂停流水线
      if (PIPELINE_REVIEW_STEPS.includes(step)) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { status: 'asset_review' },
        });
        this.ws.emitToProject(projectId, 'step:need_review', { step });
        return;
      }

      // 自动投递下一步骤
      await this.orchestrator.scheduleNextStep(projectId, step);
    } catch (error) {
      this.logger.error(
        `Failed: Project ${projectId} - Step ${step}: ${(error as Error).message}`,
      );

      // BullMQ 会根据 attempts 配置自动重试
      // 只有在最后一次重试也失败时，才标记项目为 failed
      if (job.attemptsMade + 1 >= (job.opts?.attempts ?? 3)) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { status: 'failed', currentStep: step },
        });
        this.ws.emitToProject(projectId, 'step:failed', {
          step,
          error: (error as Error).message,
        });
      }

      throw error;
    }
  }

  private async executeStep(projectId: string, step: PipelineStep): Promise<void> {
    switch (step) {
      case 'analysis':
        return this.analysisService.execute(projectId);
      case 'asset':
        return this.assetService.execute(projectId);
      case 'storyboard':
        return this.storyboardService.execute(projectId);
      case 'anchor':
        return this.anchorService.execute(projectId);
      case 'video':
        return this.videoService.execute(projectId);
      case 'assembly':
        return this.assemblyService.execute(projectId);
    }
  }

  /**
   * 幂等性保障：清理指定步骤已有的输出数据
   */
  private async clearStepOutput(projectId: string, step: PipelineStep): Promise<void> {
    this.logger.log(`Clearing existing output for step: ${step}`);

    switch (step) {
      case 'analysis':
        await this.prisma.episode.deleteMany({ where: { projectId } });
        await this.prisma.character.deleteMany({ where: { projectId } });
        await this.prisma.scene.deleteMany({ where: { projectId } });
        break;

      case 'asset':
        await this.prisma.characterImage.deleteMany({
          where: { character: { projectId } },
        });
        await this.prisma.characterSheet.deleteMany({
          where: { character: { projectId } },
        });
        await this.prisma.sceneImage.deleteMany({
          where: { scene: { projectId } },
        });
        break;

      case 'storyboard':
        await this.prisma.shotCharacter.deleteMany({
          where: { shot: { episode: { projectId } } },
        });
        await this.prisma.shot.deleteMany({
          where: { episode: { projectId } },
        });
        break;

      case 'anchor':
        await this.prisma.shotImage.deleteMany({
          where: { shot: { episode: { projectId } } },
        });
        break;

      case 'video':
        await this.prisma.shotVideo.deleteMany({
          where: { shot: { episode: { projectId } } },
        });
        break;

      case 'assembly':
        await this.prisma.finalVideo.deleteMany({
          where: { episode: { projectId } },
        });
        break;
    }
  }
}
