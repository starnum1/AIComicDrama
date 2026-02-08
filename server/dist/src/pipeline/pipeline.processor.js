"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PipelineProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const ai_providers_service_1 = require("../ai-providers/ai-providers.service");
const asset_service_1 = require("../steps/asset/asset.service");
const episode_service_1 = require("../steps/episode/episode.service");
const storyboard_service_1 = require("../steps/storyboard/storyboard.service");
const anchor_service_1 = require("../steps/anchor/anchor.service");
const video_service_1 = require("../steps/video/video.service");
const assembly_service_1 = require("../steps/assembly/assembly.service");
const ws_gateway_1 = require("../common/ws.gateway");
const pipeline_orchestrator_1 = require("./pipeline.orchestrator");
const shared_1 = require("@aicomic/shared");
let PipelineProcessor = PipelineProcessor_1 = class PipelineProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, aiProvidersService, orchestrator, assetService, episodeService, storyboardService, anchorService, videoService, assemblyService, ws) {
        super();
        this.prisma = prisma;
        this.aiProvidersService = aiProvidersService;
        this.orchestrator = orchestrator;
        this.assetService = assetService;
        this.episodeService = episodeService;
        this.storyboardService = storyboardService;
        this.anchorService = anchorService;
        this.videoService = videoService;
        this.assemblyService = assemblyService;
        this.ws = ws;
        this.logger = new common_1.Logger(PipelineProcessor_1.name);
    }
    async process(job) {
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
            if (shared_1.PIPELINE_REVIEW_STEPS.includes(step)) {
                await this.prisma.project.update({
                    where: { id: projectId },
                    data: { status: `${step}_review` },
                });
                this.ws.emitToProject(projectId, 'step:need_review', { step });
                return;
            }
            await this.orchestrator.scheduleNextStep(projectId, step);
        }
        catch (error) {
            const errorMsg = error.message;
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
            }
            else {
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
    async executeStep(projectId, step, aiConfigs) {
        switch (step) {
            case 'asset': return this.assetService.execute(projectId, aiConfigs);
            case 'episode': return this.episodeService.execute(projectId, aiConfigs);
            case 'storyboard': return this.storyboardService.execute(projectId, aiConfigs);
            case 'anchor': return this.anchorService.execute(projectId, aiConfigs);
            case 'video': return this.videoService.execute(projectId, aiConfigs);
            case 'assembly': return this.assemblyService.execute(projectId, aiConfigs);
        }
    }
    async clearStepOutput(projectId, step) {
        this.logger.log(`Clearing existing output for step: ${step}`);
        switch (step) {
            case 'asset':
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
};
exports.PipelineProcessor = PipelineProcessor;
exports.PipelineProcessor = PipelineProcessor = PipelineProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('pipeline', { concurrency: 2 }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_providers_service_1.AiProvidersService,
        pipeline_orchestrator_1.PipelineOrchestrator,
        asset_service_1.AssetService,
        episode_service_1.EpisodeService,
        storyboard_service_1.StoryboardService,
        anchor_service_1.AnchorService,
        video_service_1.VideoService,
        assembly_service_1.AssemblyService,
        ws_gateway_1.WsGateway])
], PipelineProcessor);
//# sourceMappingURL=pipeline.processor.js.map