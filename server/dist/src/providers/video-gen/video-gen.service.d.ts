import { ConfigService } from '@nestjs/config';
export interface VideoGenRequest {
    firstFrameUrl: string;
    lastFrameUrl?: string;
    prompt: string;
    duration: number;
}
export interface VideoGenResponse {
    taskId: string;
}
export interface VideoGenResult {
    status: 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    cost?: number;
}
export declare class VideoGenService {
    private config;
    private baseUrl;
    private apiKey;
    private model;
    constructor(config: ConfigService);
    submit(request: VideoGenRequest): Promise<VideoGenResponse>;
    getResult(taskId: string): Promise<VideoGenResult>;
    generateAndWait(request: VideoGenRequest, pollIntervalMs?: number, timeoutMs?: number): Promise<VideoGenResult>;
}
