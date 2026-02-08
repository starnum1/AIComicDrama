import { Injectable } from '@nestjs/common';
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

@Injectable()
export class ImageGenService {
  private defaultBaseUrl: string;
  private defaultApiKey: string;
  private defaultModel: string;

  constructor(private config: ConfigService) {
    this.defaultBaseUrl = config.get('IMAGE_GEN_BASE_URL')!;
    this.defaultApiKey = config.get('IMAGE_GEN_API_KEY')!;
    this.defaultModel = config.get('IMAGE_GEN_MODEL')!;
  }

  async generate(request: ImageGenRequest, providerConfig?: AiProviderConfig): Promise<ImageGenResponse> {
    const baseUrl = providerConfig?.baseUrl ?? this.defaultBaseUrl;
    const apiKey = providerConfig?.apiKey ?? this.defaultApiKey;
    const model = providerConfig?.model ?? this.defaultModel;

    const response = await fetch(baseUrl + '/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        size: (request.width || 1920) + 'x' + (request.height || 1080),
        ...(request.referenceImageUrl && {
          reference_image: request.referenceImageUrl,
          reference_strength: request.referenceStrength || 0.6,
        }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Image API error: ' + (data.error?.message || 'Unknown error'));
    }

    return {
      imageUrl: data.data[0].url,
      cost: 0,
    };
  }
}
