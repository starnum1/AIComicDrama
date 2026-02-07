import { Injectable } from '@nestjs/common';
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

@Injectable()
export class VideoGenService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('VIDEO_GEN_BASE_URL')!;
    this.apiKey = config.get('VIDEO_GEN_API_KEY')!;
    this.model = config.get('VIDEO_GEN_MODEL')!;
  }

  /**
   * 提交视频生成任务（异步，返回任务ID）
   */
  async submit(request: VideoGenRequest): Promise<VideoGenResponse> {
    const response = await fetch(`${this.baseUrl}/video/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        first_frame_image: request.firstFrameUrl,
        last_frame_image: request.lastFrameUrl,
        prompt: request.prompt,
        duration: request.duration,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Video API error: ${data.error?.message || 'Unknown error'}`);
    }

    return { taskId: data.task_id || data.id };
  }

  /**
   * 查询视频生成结果（轮询直到完成）
   */
  async getResult(taskId: string): Promise<VideoGenResult> {
    const response = await fetch(`${this.baseUrl}/video/generations/${taskId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Video API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      status:
        data.status === 'completed'
          ? 'completed'
          : data.status === 'failed'
            ? 'failed'
            : 'processing',
      videoUrl: data.video_url || data.output?.video_url,
      cost: data.cost,
    };
  }

  /**
   * 提交并等待完成（轮询封装）
   */
  async generateAndWait(
    request: VideoGenRequest,
    pollIntervalMs = 5000,
    timeoutMs = 300000,
  ): Promise<VideoGenResult> {
    const { taskId } = await this.submit(request);

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getResult(taskId);
      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Video generation timeout after ${timeoutMs}ms`);
  }
}
