import { ConfigService } from '@nestjs/config';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
export interface ImageGenRequest {
    prompt: string;
    negativePrompt?: string;
    referenceImageUrl?: string;
    referenceStrength?: number;
    width?: number;
    height?: number;
    style?: string;
}
export interface ImageGenResponse {
    imageUrl: string;
    cost: number;
}
export declare class ImageGenService {
    private config;
    private defaultBaseUrl;
    private defaultApiKey;
    private defaultModel;
    constructor(config: ConfigService);
    generate(request: ImageGenRequest, providerConfig?: AiProviderConfig): Promise<ImageGenResponse>;
}
