import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { WsGateway } from '../common/ws.gateway';
import { PipelineStep, PIPELINE_STEP_ORDER } from '@aicomic/shared';

export interface PipelineJobData {
  projectId: string;
  step: PipelineStep;
}

@Injectable()
export class PipelineOrchestrator {
  private readonly logger = new Logger(PipelineOrchestrator.name);

  constructor(
    @InjectQueue('pipeline') private pipelineQueue: Queue<PipelineJobData>,
    private prisma: PrismaService,
    private ws: WsGateway,
  ) {}

  /**
   * 从指定步骤开始执行流水线（投递到队列，立即返回）
   */
  async startFrom(projectId: string, fromStep: PipelineStep): Promise<void> {
    // 如果已经有同名 jobId 的任务，先移除（支持重跑）
    const existingJob = await this.pipelineQueue.getJob(`${projectId}-${fromStep}`);
    if (existingJob) {
      await existingJob.remove().catch(() => {});
    }

    await this.pipelineQueue.add(
      'execute-step',
      {
        projectId,
        step: fromStep,
      },
      {
        jobId: `${projectId}-${fromStep}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Project ${projectId} - 已投递任务: ${fromStep}`);
  }

  /**
   * 投递下一步骤（由 Processor 在当前步骤完成后调用）
   */
  async scheduleNextStep(projectId: string, currentStep: PipelineStep): Promise<void> {
    const currentIndex = PIPELINE_STEP_ORDER.indexOf(currentStep);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= PIPELINE_STEP_ORDER.length) {
      // 全部完成
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'completed' },
      });
      this.ws.emitToProject(projectId, 'project:complete', {});
      return;
    }

    const nextStep = PIPELINE_STEP_ORDER[nextIndex];
    await this.startFrom(projectId, nextStep);
  }

  /**
   * 用户确认资产后，继续执行后续步骤
   */
  async continueAfterAssetReview(projectId: string): Promise<void> {
    await this.startFrom(projectId, 'storyboard');
  }

  /**
   * 从某个步骤重跑
   */
  async restartFrom(projectId: string, fromStep: PipelineStep): Promise<void> {
    await this.clearOutputsFrom(projectId, fromStep);
    await this.startFrom(projectId, fromStep);
  }

  /**
   * 重新生成单个镜头（投递专用任务）
   */
  async retrySingleShot(shotId: string, fromStep: 'anchor' | 'video'): Promise<void> {
    await this.pipelineQueue.add(
      'retry-shot',
      {
        shotId,
        fromStep,
      } as any,
      {
        jobId: `shot-${shotId}-${fromStep}-${Date.now()}`,
      },
    );
  }

  // ========== 私有方法 ==========

  async clearOutputsFrom(projectId: string, fromStep: PipelineStep): Promise<void> {
    const startIndex = PIPELINE_STEP_ORDER.indexOf(fromStep);
    const stepsToClear = PIPELINE_STEP_ORDER.slice(startIndex);

    for (const step of stepsToClear) {
      switch (step) {
        case 'analysis':
          await this.prisma.character.deleteMany({ where: { projectId } });
          await this.prisma.scene.deleteMany({ where: { projectId } });
          await this.prisma.episode.deleteMany({
            where: { project: { id: projectId } },
          });
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
}
