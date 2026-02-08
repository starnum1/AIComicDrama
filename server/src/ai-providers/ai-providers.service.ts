import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const VALID_PROVIDER_TYPES = ['llm', 'image_gen', 'video_gen'] as const;
export type AiProviderType = (typeof VALID_PROVIDER_TYPES)[number];

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

@Injectable()
export class AiProvidersService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.aiProvider.findMany({
      where: { userId },
      orderBy: [{ providerType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listMasked(userId: string) {
    const providers = await this.list(userId);
    return providers.map((p) => ({ ...p, apiKey: this.maskApiKey(p.apiKey) }));
  }

  async create(userId: string, data: { name: string; providerType: string; baseUrl: string; apiKey: string; model: string; isDefault?: boolean }) {
    if (!VALID_PROVIDER_TYPES.includes(data.providerType as AiProviderType)) {
      throw new BadRequestException('Invalid provider type. Must be: ' + VALID_PROVIDER_TYPES.join(', '));
    }
    if (data.isDefault) {
      await this.prisma.aiProvider.updateMany({ where: { userId, providerType: data.providerType, isDefault: true }, data: { isDefault: false } });
    }
    const provider = await this.prisma.aiProvider.create({ data: { userId, name: data.name, providerType: data.providerType, baseUrl: data.baseUrl, apiKey: data.apiKey, model: data.model, isDefault: data.isDefault ?? false } });
    return { ...provider, apiKey: this.maskApiKey(provider.apiKey) };
  }

  async update(userId: string, providerId: string, data: { name?: string; baseUrl?: string; apiKey?: string; model?: string; isDefault?: boolean }) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('AI provider not found');
    if (provider.userId !== userId) throw new ForbiddenException('No permission');
    if (data.isDefault) {
      await this.prisma.aiProvider.updateMany({ where: { userId, providerType: provider.providerType, isDefault: true, id: { not: providerId } }, data: { isDefault: false } });
    }
    const updated = await this.prisma.aiProvider.update({ where: { id: providerId }, data });
    return { ...updated, apiKey: this.maskApiKey(updated.apiKey) };
  }

  async remove(userId: string, providerId: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('AI provider not found');
    if (provider.userId !== userId) throw new ForbiddenException('No permission');
    await this.prisma.project.updateMany({ where: { llmProviderId: providerId }, data: { llmProviderId: null } });
    await this.prisma.project.updateMany({ where: { imageProviderId: providerId }, data: { imageProviderId: null } });
    await this.prisma.project.updateMany({ where: { videoProviderId: providerId }, data: { videoProviderId: null } });
    await this.prisma.aiProvider.delete({ where: { id: providerId } });
    return { success: true };
  }

  async resolveProjectAiConfigs(projectId: string): Promise<{ llm?: AiProviderConfig; imageGen?: AiProviderConfig; videoGen?: AiProviderConfig }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { llmProvider: true, imageProvider: true, videoProvider: true } });
    if (!project) return {};
    const userDefaults = await this.prisma.aiProvider.findMany({ where: { userId: project.userId, isDefault: true } });
    const defaultMap = new Map(userDefaults.map((p) => [p.providerType, p]));
    const resolve = (projectProvider: { baseUrl: string; apiKey: string; model: string } | null, type: AiProviderType): AiProviderConfig | undefined => {
      const source = projectProvider ?? defaultMap.get(type);
      if (!source) return undefined;
      return { baseUrl: source.baseUrl, apiKey: source.apiKey, model: source.model };
    };
    return { llm: resolve(project.llmProvider, 'llm'), imageGen: resolve(project.imageProvider, 'image_gen'), videoGen: resolve(project.videoProvider, 'video_gen') };
  }

  async testConnection(_userId: string, data: { baseUrl: string; apiKey: string; model: string; providerType: string }) {
    try {
      if (data.providerType === 'llm') {
        const response = await fetch(data.baseUrl + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.apiKey }, body: JSON.stringify({ model: data.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }) });
        const result = await response.json();
        if (!response.ok) return { success: false, error: result.error?.message || 'HTTP ' + response.status };
        return { success: true, message: 'Connection successful' };
      }
      const response = await fetch(data.baseUrl + '/models', { headers: { Authorization: 'Bearer ' + data.apiKey } });
      if (!response.ok) return { success: false, error: 'HTTP ' + response.status };
      return { success: true, message: 'Connection successful' };
    } catch (error) { return { success: false, error: (error as Error).message }; }
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }
}
