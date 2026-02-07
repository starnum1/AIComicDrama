import { WorkerHost } from '@nestjs/bullmq';
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
export declare class PipelineProcessor extends WorkerHost {
    private prisma;
    private orchestrator;
    private analysisService;
    private assetService;
    private storyboardService;
    private anchorService;
    private videoService;
    private assemblyService;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: PipelineOrchestrator, analysisService: AnalysisService, assetService: AssetService, storyboardService: StoryboardService, anchorService: AnchorService, videoService: VideoService, assemblyService: AssemblyService, ws: WsGateway);
    process(job: Job<PipelineJobData>): Promise<void>;
    private executeStep;
    private clearStepOutput;
}
