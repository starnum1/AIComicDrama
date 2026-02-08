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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("./projects.service");
const auth_guard_1 = require("../auth/auth.guard");
let ProjectsController = class ProjectsController {
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async listProjects(req) {
        return this.projectsService.listProjects(req.user.sub);
    }
    async createProject(req, body) {
        return this.projectsService.createProject(req.user.sub, body.name);
    }
    async getProject(req, id) {
        return this.projectsService.getProject(req.user.sub, id);
    }
    async deleteProject(req, id) {
        return this.projectsService.deleteProject(req.user.sub, id);
    }
    async updateAiConfig(req, id, body) {
        return this.projectsService.updateAiConfig(req.user.sub, id, body);
    }
    async uploadNovel(req, id, body) {
        return this.projectsService.uploadNovel(req.user.sub, id, body.text);
    }
    async startPipeline(req, id) {
        return this.projectsService.startPipeline(req.user.sub, id);
    }
    async confirmAssets(req, id) {
        return this.projectsService.confirmAssets(req.user.sub, id);
    }
    async continueStep(req, id) {
        return this.projectsService.continueStep(req.user.sub, id);
    }
    async restartStep(req, id, step) {
        return this.projectsService.restartStep(req.user.sub, id, step);
    }
    async retryShot(req, id, step) {
        return this.projectsService.retryShot(req.user.sub, id, step);
    }
    async getProjectAssets(req, id) {
        return this.projectsService.getProjectAssets(req.user.sub, id);
    }
    async generateCharacterImage(req, id, characterId, body) {
        return this.projectsService.generateCharacterImage(req.user.sub, id, characterId, body.imageProviderId);
    }
    async generateSceneImage(req, id, sceneId, body) {
        return this.projectsService.generateSceneImage(req.user.sub, id, sceneId, body.variant || 'default', body.imageProviderId);
    }
    async generateAllAssets(req, id, body) {
        return this.projectsService.generateAllAssets(req.user.sub, id, body.imageProviderId);
    }
    async deleteCharacterSheet(req, id) {
        return this.projectsService.deleteCharacterSheet(req.user.sub, id);
    }
    async deleteSceneImage(req, id) {
        return this.projectsService.deleteSceneImage(req.user.sub, id);
    }
    async getCharacterSheets(req, id) {
        return this.projectsService.getCharacterSheets(req.user.sub, id);
    }
    async deleteCharacterImage(req, id) {
        return this.projectsService.deleteCharacterImage(req.user.sub, id);
    }
    async getEpisodes(req, id) {
        return this.projectsService.getEpisodes(req.user.sub, id);
    }
    async updateEpisode(req, id, body) {
        return this.projectsService.updateEpisode(req.user.sub, id, body);
    }
    async getCharacters(req, id) {
        return this.projectsService.getCharacters(req.user.sub, id);
    }
    async getScenes(req, id) {
        return this.projectsService.getScenes(req.user.sub, id);
    }
    async getShots(req, id) {
        return this.projectsService.getShots(req.user.sub, id);
    }
    async updateShot(req, id, body) {
        return this.projectsService.updateShot(req.user.sub, id, body);
    }
    async getFinalVideo(req, id) {
        return this.projectsService.getFinalVideo(req.user.sub, id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listProjects", null);
__decorate([
    (0, common_1.Post)('projects'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createProject", null);
__decorate([
    (0, common_1.Get)('projects/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getProject", null);
__decorate([
    (0, common_1.Delete)('projects/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteProject", null);
__decorate([
    (0, common_1.Put)('projects/:id/ai-config'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateAiConfig", null);
__decorate([
    (0, common_1.Post)('projects/:id/novel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "uploadNovel", null);
__decorate([
    (0, common_1.Post)('projects/:id/pipeline/start'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "startPipeline", null);
__decorate([
    (0, common_1.Post)('projects/:id/pipeline/confirm-assets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "confirmAssets", null);
__decorate([
    (0, common_1.Post)('projects/:id/pipeline/continue'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "continueStep", null);
__decorate([
    (0, common_1.Post)('projects/:id/pipeline/restart/:step'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('step')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "restartStep", null);
__decorate([
    (0, common_1.Post)('shots/:id/retry/:step'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('step')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "retryShot", null);
__decorate([
    (0, common_1.Get)('projects/:id/assets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getProjectAssets", null);
__decorate([
    (0, common_1.Post)('projects/:id/generate-character-image/:characterId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('characterId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "generateCharacterImage", null);
__decorate([
    (0, common_1.Post)('projects/:id/generate-scene-image/:sceneId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('sceneId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "generateSceneImage", null);
__decorate([
    (0, common_1.Post)('projects/:id/generate-all-assets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "generateAllAssets", null);
__decorate([
    (0, common_1.Delete)('character-sheets/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteCharacterSheet", null);
__decorate([
    (0, common_1.Delete)('scene-images/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteSceneImage", null);
__decorate([
    (0, common_1.Get)('projects/:id/character-sheets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getCharacterSheets", null);
__decorate([
    (0, common_1.Delete)('character-images/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteCharacterImage", null);
__decorate([
    (0, common_1.Get)('projects/:id/episodes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getEpisodes", null);
__decorate([
    (0, common_1.Put)('episodes/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateEpisode", null);
__decorate([
    (0, common_1.Get)('projects/:id/characters'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getCharacters", null);
__decorate([
    (0, common_1.Get)('projects/:id/scenes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getScenes", null);
__decorate([
    (0, common_1.Get)('episodes/:id/shots'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getShots", null);
__decorate([
    (0, common_1.Put)('shots/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateShot", null);
__decorate([
    (0, common_1.Get)('episodes/:id/final-video'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getFinalVideo", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map