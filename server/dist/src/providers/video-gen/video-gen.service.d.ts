import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
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
    private resolveConfig;
    submit(request: VideoGenRequest, providerConfig?: AiProviderConfig): Promise<VideoGenResponse>;
    getResult(taskId: string, providerConfig?: AiProviderConfig): Promise<VideoGenResult>;
    generateAndWait(request: VideoGenRequest, providerConfig?: AiProviderConfig, pollIntervalMs?: number, timeoutMs?: number): Promise<VideoGenResult>;
}
