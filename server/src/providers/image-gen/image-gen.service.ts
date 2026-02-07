import { Injectable } from '@nestjs/common';
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

@Injectable()
export class ImageGenService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('IMAGE_GEN_BASE_URL')!;
    this.apiKey = config.get('IMAGE_GEN_API_KEY')!;
    this.model = config.get('IMAGE_GEN_MODEL')!;
  }

  async generate(request: ImageGenRequest): Promise<ImageGenResponse> {
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        size: `${request.width || 1920}x${request.height || 1080}`,
        ...(request.referenceImageUrl && {
          reference_image: request.referenceImageUrl,
          reference_strength: request.referenceStrength || 0.6,
        }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Image API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      imageUrl: data.data[0].url,
      cost: 0,
    };
  }
}
