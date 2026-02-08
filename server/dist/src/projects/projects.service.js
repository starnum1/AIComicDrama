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
var ProjectsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const pipeline_orchestrator_1 = require("../pipeline/pipeline.orchestrator");
let ProjectsService = ProjectsService_1 = class ProjectsService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(ProjectsService_1.name);
    }
    async listProjects(userId) {
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
    async createProject(userId, name) {
        return this.prisma.project.create({
            data: { userId, name },
        });
    }
    async getProject(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                novel: { select: { id: true, charCount: true, createdAt: true } },
                _count: {
                    select: {
                        characters: true,
                        scenes: true,
                        episodes: true,
                    },
                },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权访问');
        return project;
    }
    async deleteProject(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        await this.prisma.$transaction(async (tx) => {
            await tx.task.deleteMany({ where: { projectId } });
            const episodes = await tx.episode.findMany({
                where: { projectId },
                select: { id: true },
            });
            const episodeIds = episodes.map((e) => e.id);
            if (episodeIds.length > 0) {
                await tx.finalVideo.deleteMany({
                    where: { episodeId: { in: episodeIds } },
                });
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
            await tx.novel.deleteMany({ where: { projectId } });
            await tx.project.delete({ where: { id: projectId } });
        });
        return { success: true };
    }
    async updateAiConfig(userId, projectId, config) {
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
    async uploadNovel(userId, projectId, text) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
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
    async startPipeline(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { novel: true },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        if (!project.novel) {
            throw new common_1.BadRequestException('请先上传小说文本');
        }
        this.logger.log(`Starting pipeline for project ${projectId}`);
        await this.orchestrator.startFrom(projectId, 'analysis');
        this.logger.log(`Pipeline task queued for project ${projectId}`);
        return { success: true, message: '流水线已启动' };
    }
    async confirmAssets(userId, projectId) {
        return this.continueStep(userId, projectId);
    }
    async continueStep(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        if (!project.status?.endsWith('_review')) {
            throw new common_1.BadRequestException('当前状态不需要确认');
        }
        await this.orchestrator.continueAfterReview(projectId);
        return { success: true, message: '已确认，继续执行下一步' };
    }
    async restartStep(userId, projectId, step) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        await this.orchestrator.restartFrom(projectId, step);
        return { success: true, message: `从 ${step} 步骤重新开始` };
    }
    async retryShot(userId, shotId, step) {
        const shot = await this.prisma.shot.findUnique({
            where: { id: shotId },
            include: { episode: { include: { project: true } } },
        });
        if (!shot)
            throw new common_1.NotFoundException('镜头不存在');
        if (shot.episode.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        return { success: true, message: `镜头 ${shotId} 的 ${step} 步骤已重新提交` };
    }
    async getCharacterSheets(userId, projectId) {
        await this.verifyProjectOwnership(userId, projectId);
        return this.prisma.character.findMany({
            where: { projectId },
            include: {
                sheets: {
                    orderBy: { createdAt: 'desc' },
                },
                images: {
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async regenerateSheet(userId, sheetId) {
        const sheet = await this.prisma.characterSheet.findUnique({
            where: { id: sheetId },
            include: { character: { include: { project: true } } },
        });
        if (!sheet)
            throw new common_1.NotFoundException('设定图不存在');
        if (sheet.character.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        return { success: true, message: '已提交重新生成请求' };
    }
    async cropSheet(userId, sheetId, imageType, cropRegion) {
        const sheet = await this.prisma.characterSheet.findUnique({
            where: { id: sheetId },
            include: { character: { include: { project: true } } },
        });
        if (!sheet)
            throw new common_1.NotFoundException('设定图不存在');
        if (sheet.character.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        const image = await this.prisma.characterImage.create({
            data: {
                characterId: sheet.characterId,
                sheetId: sheet.id,
                imageType,
                imageUrl: '',
                cropRegion,
                stateName: sheet.stateName,
            },
        });
        return image;
    }
    async deleteCharacterImage(userId, imageId) {
        const image = await this.prisma.characterImage.findUnique({
            where: { id: imageId },
            include: { character: { include: { project: true } } },
        });
        if (!image)
            throw new common_1.NotFoundException('图片不存在');
        if (image.character.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        await this.prisma.characterImage.delete({ where: { id: imageId } });
        return { success: true };
    }
    async getEpisodes(userId, projectId) {
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
    async updateEpisode(userId, episodeId, data) {
        const episode = await this.prisma.episode.findUnique({
            where: { id: episodeId },
            include: { project: true },
        });
        if (!episode)
            throw new common_1.NotFoundException('集不存在');
        if (episode.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        return this.prisma.episode.update({
            where: { id: episodeId },
            data,
        });
    }
    async getCharacters(userId, projectId) {
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
    async getScenes(userId, projectId) {
        await this.verifyProjectOwnership(userId, projectId);
        return this.prisma.scene.findMany({
            where: { projectId },
            include: { images: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getShots(userId, episodeId) {
        const episode = await this.prisma.episode.findUnique({
            where: { id: episodeId },
            include: { project: true },
        });
        if (!episode)
            throw new common_1.NotFoundException('集不存在');
        if (episode.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
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
    async updateShot(userId, shotId, data) {
        const shot = await this.prisma.shot.findUnique({
            where: { id: shotId },
            include: { episode: { include: { project: true } } },
        });
        if (!shot)
            throw new common_1.NotFoundException('镜头不存在');
        if (shot.episode.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        return this.prisma.shot.update({
            where: { id: shotId },
            data,
        });
    }
    async getFinalVideo(userId, episodeId) {
        const episode = await this.prisma.episode.findUnique({
            where: { id: episodeId },
            include: { project: true },
        });
        if (!episode)
            throw new common_1.NotFoundException('集不存在');
        if (episode.project.userId !== userId)
            throw new common_1.ForbiddenException('无权操作');
        const video = await this.prisma.finalVideo.findUnique({
            where: { episodeId },
        });
        if (!video)
            throw new common_1.NotFoundException('成片尚未生成');
        return video;
    }
    async verifyProjectOwnership(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new common_1.NotFoundException('项目不存在');
        if (project.userId !== userId)
            throw new common_1.ForbiddenException('无权访问');
        return project;
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = ProjectsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pipeline_orchestrator_1.PipelineOrchestrator])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map