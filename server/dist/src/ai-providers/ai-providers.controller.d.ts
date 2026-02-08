import { AiProvidersService } from './ai-providers.service';
export declare class AiProvidersController {
    private readonly service;
    constructor(service: AiProvidersService);
    list(req: any): Promise<{
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
    create(req: any, body: {
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
    update(req: any, id: string, body: {
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
    remove(req: any, id: string): Promise<{
        success: boolean;
    }>;
    testConnection(req: any, body: {
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
}
