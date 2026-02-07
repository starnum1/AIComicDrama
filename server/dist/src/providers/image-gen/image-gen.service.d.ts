import { ConfigService } from '@nestjs/config';
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
    private baseUrl;
    private apiKey;
    private model;
    constructor(config: ConfigService);
    generate(request: ImageGenRequest): Promise<ImageGenResponse>;
}
