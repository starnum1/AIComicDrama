import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class StorageService implements OnModuleInit {
    private config;
    private client;
    private bucket;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    uploadBuffer(buffer: Buffer, path: string, contentType: string): Promise<string>;
    uploadFromUrl(sourceUrl: string, path: string): Promise<string>;
    getFileUrl(path: string): string;
    generatePath(projectId: string, category: string, extension: string): string;
}
