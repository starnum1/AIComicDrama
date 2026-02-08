import { Injectable } from '@nestjs/common';
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
  private resolveConfig(providerConfig?: AiProviderConfig) {
    if (!providerConfig) {
      throw new Error('未配置图片生成服务。请在「AI 服务配置」中添加一个 image_gen 类型的 Provider 并设为默认。');
    }
    return providerConfig;
  }

  async generate(request: ImageGenRequest, providerConfig?: AiProviderConfig): Promise<ImageGenResponse> {
    const config = this.resolveConfig(providerConfig);
    const { baseUrl, apiKey, model } = config;

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

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Image API returned non-JSON (HTTP ${response.status}): ${rawText.slice(0, 500)}`);
    }

    if (!response.ok) {
      const errMsg = data.error?.message || data.message || data.error || JSON.stringify(data).slice(0, 300);
      throw new Error(`Image API error (HTTP ${response.status}): ${errMsg}`);
    }

    return {
      imageUrl: data.data[0].url,
      cost: 0,
    };
  }
}
