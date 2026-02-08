import { AiProvidersService } from './ai-providers.service';
export declare class AiProvidersController {
    private readonly service;
    constructor(service: AiProvidersService);
    list(req: any): Promise<{
        id: string;
        userId: string;
        name: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(req: any, body: {
        name: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault?: boolean;
    }): Promise<{
        id: string;
        userId: string;
        name: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, id: string, body: {
        name?: string;
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        isDefault?: boolean;
    }): Promise<{
        id: string;
        userId: string;
        name: string;
        providerType: string;
        baseUrl: string;
        apiKey: string;
        model: string;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
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
