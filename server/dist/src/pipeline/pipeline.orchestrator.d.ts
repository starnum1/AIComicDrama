import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { WsGateway } from '../common/ws.gateway';
import { PipelineStep } from '@aicomic/shared';
export interface PipelineJobData {
    projectId: string;
    step: PipelineStep;
}
export declare class PipelineOrchestrator {
    private pipelineQueue;
    private prisma;
    private ws;
    private readonly logger;
    constructor(pipelineQueue: Queue<PipelineJobData>, prisma: PrismaService, ws: WsGateway);
    startFrom(projectId: string, fromStep: PipelineStep): Promise<void>;
    scheduleNextStep(projectId: string, currentStep: PipelineStep): Promise<void>;
    continueAfterAssetReview(projectId: string): Promise<void>;
    restartFrom(projectId: string, fromStep: PipelineStep): Promise<void>;
    retrySingleShot(shotId: string, fromStep: 'anchor' | 'video'): Promise<void>;
    clearOutputsFrom(projectId: string, fromStep: PipelineStep): Promise<void>;
}
