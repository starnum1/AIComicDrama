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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PipelineOrchestrator_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../common/prisma.service");
const ws_gateway_1 = require("../common/ws.gateway");
const shared_1 = require("@aicomic/shared");
let PipelineOrchestrator = PipelineOrchestrator_1 = class PipelineOrchestrator {
    constructor(pipelineQueue, prisma, ws) {
        this.pipelineQueue = pipelineQueue;
        this.prisma = prisma;
        this.ws = ws;
        this.logger = new common_1.Logger(PipelineOrchestrator_1.name);
    }
    async startFrom(projectId, fromStep) {
        await this.pipelineQueue.add('execute-step', {
            projectId,
            step: fromStep,
        }, {
            jobId: `${projectId}-${fromStep}`,
        });
        this.logger.log(`Project ${projectId} - 已投递任务: ${fromStep}`);
    }
    async scheduleNextStep(projectId, currentStep) {
        const currentIndex = shared_1.PIPELINE_STEP_ORDER.indexOf(currentStep);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= shared_1.PIPELINE_STEP_ORDER.length) {
            await this.prisma.project.update({
                where: { id: projectId },
                data: { status: 'completed' },
            });
            this.ws.emitToProject(projectId, 'project:complete', {});
            return;
        }
        const nextStep = shared_1.PIPELINE_STEP_ORDER[nextIndex];
        await this.startFrom(projectId, nextStep);
    }
    async continueAfterAssetReview(projectId) {
        await this.startFrom(projectId, 'storyboard');
    }
    async restartFrom(projectId, fromStep) {
        await this.clearOutputsFrom(projectId, fromStep);
        await this.startFrom(projectId, fromStep);
    }
    async retrySingleShot(shotId, fromStep) {
        await this.pipelineQueue.add('retry-shot', {
            shotId,
            fromStep,
        }, {
            jobId: `shot-${shotId}-${fromStep}-${Date.now()}`,
        });
    }
    async clearOutputsFrom(projectId, fromStep) {
        const startIndex = shared_1.PIPELINE_STEP_ORDER.indexOf(fromStep);
        const stepsToClear = shared_1.PIPELINE_STEP_ORDER.slice(startIndex);
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
};
exports.PipelineOrchestrator = PipelineOrchestrator;
exports.PipelineOrchestrator = PipelineOrchestrator = PipelineOrchestrator_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('pipeline')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_1.PrismaService,
        ws_gateway_1.WsGateway])
], PipelineOrchestrator);
//# sourceMappingURL=pipeline.orchestrator.js.map