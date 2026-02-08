import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import type { AiProviderConfig } from '../ai-providers/ai-providers.service';
import { AssetService } from '../steps/asset/asset.service';
import { EpisodeService } from '../steps/episode/episode.service';
import { StoryboardService } from '../steps/storyboard/storyboard.service';
import { AnchorService } from '../steps/anchor/anchor.service';
import { VideoService } from '../steps/video/video.service';
import { AssemblyService } from '../steps/assembly/assembly.service';
import { WsGateway } from '../common/ws.gateway';
import { PipelineOrchestrator, PipelineJobData } from './pipeline.orchestrator';
import { PipelineStep, PIPELINE_REVIEW_STEPS } from '@aicomic/shared';

export interface ProjectAiConfigs {
  llm?: AiProviderConfig;
  imageGen?: AiProviderConfig;
  videoGen?: AiProviderConfig;
}

@Processor('pipeline', { concurrency: 2 })
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(
    private prisma: PrismaService,
    private aiProvidersService: AiProvidersService,
    private orchestrator: PipelineOrchestrator,
    private assetService: AssetService,
    private episodeService: EpisodeService,
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
    this.logger.log(`Processing: Project ${projectId} - Step ${step} (attempt ${job.attemptsMade + 1})`);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { currentStep: step, status: `${step}_processing` },
    });
    this.ws.emitToProject(projectId, 'step:start', { step });

    try {
      const aiConfigs = await this.aiProvidersService.resolveProjectAiConfigs(projectId);
      this.logger.log(`AI configs: LLM=${aiConfigs.llm ? 'custom' : 'system'}, Image=${aiConfigs.imageGen ? 'custom' : 'system'}, Video=${aiConfigs.videoGen ? 'custom' : 'system'}`);

      await this.clearStepOutput(projectId, step);
      await this.executeStep(projectId, step, aiConfigs);

      this.ws.emitToProject(projectId, 'step:complete', { step });
      this.logger.log(`Completed: Project ${projectId} - Step ${step}`);

      if (PIPELINE_REVIEW_STEPS.includes(step)) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { status: `${step}_review` },
        });
        this.ws.emitToProject(projectId, 'step:need_review', { step });
        return;
      }

      await this.orchestrator.scheduleNextStep(projectId, step);
    } catch (error) {
      const errorMsg = (error as Error).message;
      const maxAttempts = job.opts?.attempts ?? 1;
      const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;

      this.logger.error(`Failed: Project ${projectId} - Step ${step} (attempt ${job.attemptsMade + 1}/${maxAttempts}): ${errorMsg}`);

      if (isLastAttempt) {
        this.logger.error(`Final failure for Project ${projectId} - Step ${step}`);
        await this.prisma.project.update({
          where: { id: projectId },
          data: { status: 'failed', currentStep: step },
        });
        this.ws.emitToProject(projectId, 'step:failed', { step, error: errorMsg });
      } else {
        this.logger.warn(`Will retry Project ${projectId} - Step ${step} (${maxAttempts - job.attemptsMade - 1} retries left)`);
        this.ws.emitToProject(projectId, 'progress:detail', {
          step,
          message: `步骤失败，正在重试 (${job.attemptsMade + 1}/${maxAttempts})...`,
          completed: 0,
          total: 0,
        });
      }

      throw error;
    }
  }

  private async executeStep(projectId: string, step: PipelineStep, aiConfigs: ProjectAiConfigs): Promise<void> {
    switch (step) {
      case 'asset': return this.assetService.execute(projectId, aiConfigs);
      case 'episode': return this.episodeService.execute(projectId, aiConfigs);
      case 'storyboard': return this.storyboardService.execute(projectId, aiConfigs);
      case 'anchor': return this.anchorService.execute(projectId, aiConfigs);
      case 'video': return this.videoService.execute(projectId, aiConfigs);
      case 'assembly': return this.assemblyService.execute(projectId, aiConfigs);
    }
  }

  private async clearStepOutput(projectId: string, step: PipelineStep): Promise<void> {
    this.logger.log(`Clearing existing output for step: ${step}`);
    switch (step) {
      case 'asset':
        // asset 步骤现在包含角色/场景提取 + 生图，清理时全部删除
        await this.prisma.characterImage.deleteMany({ where: { character: { projectId } } });
        await this.prisma.characterSheet.deleteMany({ where: { character: { projectId } } });
        await this.prisma.sceneImage.deleteMany({ where: { scene: { projectId } } });
        await this.prisma.character.deleteMany({ where: { projectId } });
        await this.prisma.scene.deleteMany({ where: { projectId } });
        break;
      case 'episode':
        await this.prisma.episode.deleteMany({ where: { projectId } });
        break;
      case 'storyboard':
        await this.prisma.shotCharacter.deleteMany({ where: { shot: { episode: { projectId } } } });
        await this.prisma.shot.deleteMany({ where: { episode: { projectId } } });
        break;
      case 'anchor':
        await this.prisma.shotImage.deleteMany({ where: { shot: { episode: { projectId } } } });
        break;
      case 'video':
        await this.prisma.shotVideo.deleteMany({ where: { shot: { episode: { projectId } } } });
        break;
      case 'assembly':
        await this.prisma.finalVideo.deleteMany({ where: { episode: { projectId } } });
        break;
    }
  }
}
