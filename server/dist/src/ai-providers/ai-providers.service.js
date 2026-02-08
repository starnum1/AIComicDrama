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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProvidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
const VALID_PROVIDER_TYPES = ['llm', 'image_gen', 'video_gen'];
let AiProvidersService = class AiProvidersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        return this.prisma.aiProvider.findMany({
            where: { userId },
            orderBy: [{ providerType: 'asc' }, { createdAt: 'desc' }],
        });
    }
    async listMasked(userId) {
        const providers = await this.list(userId);
        return providers.map((p) => ({ ...p, apiKey: this.maskApiKey(p.apiKey) }));
    }
    async create(userId, data) {
        if (!VALID_PROVIDER_TYPES.includes(data.providerType)) {
            throw new common_1.BadRequestException('Invalid provider type. Must be: ' + VALID_PROVIDER_TYPES.join(', '));
        }
        if (data.isDefault) {
            await this.prisma.aiProvider.updateMany({ where: { userId, providerType: data.providerType, isDefault: true }, data: { isDefault: false } });
        }
        const provider = await this.prisma.aiProvider.create({ data: { userId, name: data.name, providerType: data.providerType, baseUrl: data.baseUrl, apiKey: data.apiKey, model: data.model, isDefault: data.isDefault ?? false } });
        return { ...provider, apiKey: this.maskApiKey(provider.apiKey) };
    }
    async update(userId, providerId, data) {
        const provider = await this.prisma.aiProvider.findUnique({ where: { id: providerId } });
        if (!provider)
            throw new common_1.NotFoundException('AI provider not found');
        if (provider.userId !== userId)
            throw new common_1.ForbiddenException('No permission');
        if (data.isDefault) {
            await this.prisma.aiProvider.updateMany({ where: { userId, providerType: provider.providerType, isDefault: true, id: { not: providerId } }, data: { isDefault: false } });
        }
        const updated = await this.prisma.aiProvider.update({ where: { id: providerId }, data });
        return { ...updated, apiKey: this.maskApiKey(updated.apiKey) };
    }
    async remove(userId, providerId) {
        const provider = await this.prisma.aiProvider.findUnique({ where: { id: providerId } });
        if (!provider)
            throw new common_1.NotFoundException('AI provider not found');
        if (provider.userId !== userId)
            throw new common_1.ForbiddenException('No permission');
        await this.prisma.project.updateMany({ where: { llmProviderId: providerId }, data: { llmProviderId: null } });
        await this.prisma.project.updateMany({ where: { imageProviderId: providerId }, data: { imageProviderId: null } });
        await this.prisma.project.updateMany({ where: { videoProviderId: providerId }, data: { videoProviderId: null } });
        await this.prisma.aiProvider.delete({ where: { id: providerId } });
        return { success: true };
    }
    async resolveProjectAiConfigs(projectId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { llmProvider: true, imageProvider: true, videoProvider: true } });
        if (!project)
            return {};
        const userDefaults = await this.prisma.aiProvider.findMany({ where: { userId: project.userId, isDefault: true } });
        const defaultMap = new Map(userDefaults.map((p) => [p.providerType, p]));
        const resolve = (projectProvider, type) => {
            const source = projectProvider ?? defaultMap.get(type);
            if (!source)
                return undefined;
            return { baseUrl: source.baseUrl, apiKey: source.apiKey, model: source.model };
        };
        return { llm: resolve(project.llmProvider, 'llm'), imageGen: resolve(project.imageProvider, 'image_gen'), videoGen: resolve(project.videoProvider, 'video_gen') };
    }
    async testConnection(_userId, data) {
        try {
            if (data.providerType === 'llm') {
                const response = await fetch(data.baseUrl + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.apiKey }, body: JSON.stringify({ model: data.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }) });
                const result = await response.json();
                if (!response.ok)
                    return { success: false, error: result.error?.message || 'HTTP ' + response.status };
                return { success: true, message: 'Connection successful' };
            }
            const response = await fetch(data.baseUrl + '/models', { headers: { Authorization: 'Bearer ' + data.apiKey } });
            if (!response.ok)
                return { success: false, error: 'HTTP ' + response.status };
            return { success: true, message: 'Connection successful' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    maskApiKey(key) {
        if (key.length <= 8)
            return '****';
        return key.slice(0, 4) + '****' + key.slice(-4);
    }
};
exports.AiProvidersService = AiProvidersService;
exports.AiProvidersService = AiProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AiProvidersService);
//# sourceMappingURL=ai-providers.service.js.map