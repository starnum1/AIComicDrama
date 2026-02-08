import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class VideoGenService {
  private defaultBaseUrl: string;
  private defaultApiKey: string;
  private defaultModel: string;

  constructor(private config: ConfigService) {
    this.defaultBaseUrl = config.get('VIDEO_GEN_BASE_URL')!;
    this.defaultApiKey = config.get('VIDEO_GEN_API_KEY')!;
    this.defaultModel = config.get('VIDEO_GEN_MODEL')!;
  }

  async submit(request: VideoGenRequest, providerConfig?: AiProviderConfig): Promise<VideoGenResponse> {
    const baseUrl = providerConfig?.baseUrl ?? this.defaultBaseUrl;
    const apiKey = providerConfig?.apiKey ?? this.defaultApiKey;
    const model = providerConfig?.model ?? this.defaultModel;

    const response = await fetch(baseUrl + '/video/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model, first_frame_image: request.firstFrameUrl, last_frame_image: request.lastFrameUrl, prompt: request.prompt, duration: request.duration }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Video API error: ' + (data.error?.message || 'Unknown error'));
    return { taskId: data.task_id || data.id };
  }

  async getResult(taskId: string, providerConfig?: AiProviderConfig): Promise<VideoGenResult> {
    const baseUrl = providerConfig?.baseUrl ?? this.defaultBaseUrl;
    const apiKey = providerConfig?.apiKey ?? this.defaultApiKey;

    const response = await fetch(baseUrl + '/video/generations/' + taskId, {
      headers: { Authorization: 'Bearer ' + apiKey },
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Video API error: ' + (data.error?.message || 'Unknown error'));

    return {
      status: data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'processing',
      videoUrl: data.video_url || data.output?.video_url,
      cost: data.cost,
    };
  }

  async generateAndWait(request: VideoGenRequest, providerConfig?: AiProviderConfig, pollIntervalMs = 5000, timeoutMs = 300000): Promise<VideoGenResult> {
    const { taskId } = await this.submit(request, providerConfig);
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getResult(taskId, providerConfig);
      if (result.status === 'completed' || result.status === 'failed') return result;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error('Video generation timeout after ' + timeoutMs + 'ms');
  }
}
