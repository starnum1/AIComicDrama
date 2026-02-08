import { PrismaService } from '../common/prisma.service';
declare const VALID_PROVIDER_TYPES: readonly ["llm", "image_gen", "video_gen"];
export type AiProviderType = (typeof VALID_PROVIDER_TYPES)[number];
export interface AiProviderConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}
export declare class AiProvidersService {
    private prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault: boolean;
    }[]>;
    listMasked(userId: string): Promise<{
        apiKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        providerType: string;
        baseUrl: string;
        model: string;
        isDefault: boolean;
    }[]>;
    create(userId: string, data: {
        name: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault?: boolean;
    }): Promise<{
        apiKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        providerType: string;
        baseUrl: string;
        model: string;
        isDefault: boolean;
    }>;
    update(userId: string, providerId: string, data: {
        name?: string;
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        isDefault?: boolean;
    }): Promise<{
        apiKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        providerType: string;
        baseUrl: string;
        model: string;
        isDefault: boolean;
    }>;
    remove(userId: string, providerId: string): Promise<{
        success: boolean;
    }>;
    resolveProjectAiConfigs(projectId: string): Promise<{
        llm?: AiProviderConfig;
        imageGen?: AiProviderConfig;
        videoGen?: AiProviderConfig;
    }>;
    testConnection(_userId: string, data: {
        baseUrl: string;
        apiKey: string;
        model: string;
        providerType: string;
    }): Promise<{
        success: boolean;
        error: any;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        error?: undefined;
    }>;
    private maskApiKey;
}
export {};
