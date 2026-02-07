import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

@Injectable()
export class LLMService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('LLM_BASE_URL')!;
    this.apiKey = config.get('LLM_API_KEY')!;
    this.model = config.get('LLM_MODEL')!;
  }

  async chat(
    messages: LLMChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json' | 'text';
    },
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 16000,
        response_format:
          options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`LLM API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  /**
   * 便捷方法：发送JSON格式请求，自动解析 + Zod 校验 + 失败自动重试
   *
   * @param schema - Zod schema，用于校验 LLM 输出的 JSON 结构
   * @param maxRetries - 最大重试次数（JSON 解析失败或 schema 校验失败时重试）
   */
  async chatJSON<T>(
    messages: LLMChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      schema?: import('zod').ZodType<T>;
      maxRetries?: number;
    },
  ): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    const maxRetries = options?.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.chat(messages, {
          ...options,
          responseFormat: 'json',
        });

        // Step 1: JSON 解析
        let parsed: unknown;
        try {
          parsed = JSON.parse(response.content);
        } catch (parseErr) {
          throw new Error(
            `LLM 返回的 JSON 无法解析: ${(parseErr as Error).message}\n原始内容: ${response.content.slice(0, 500)}`,
          );
        }

        // Step 2: Zod schema 校验（如果提供了 schema）
        if (options?.schema) {
          const result = options.schema.safeParse(parsed);
          if (!result.success) {
            const issues = result.error.issues
              .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
              .join('\n');
            throw new Error(`LLM 输出未通过 schema 校验:\n${issues}`);
          }
          return { data: result.data, usage: response.usage };
        }

        return { data: parsed as T, usage: response.usage };
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // 将错误信息追加到对话中，让 LLM 自我修正
          messages = [
            ...messages,
            { role: 'assistant', content: '(上次输出有误)' },
            {
              role: 'user',
              content: `你上次的输出有问题：${(error as Error).message}\n请严格按照要求重新输出正确的JSON。`,
            },
          ];
        }
      }
    }

    throw new Error(
      `LLM JSON 调用在 ${maxRetries + 1} 次尝试后仍然失败: ${lastError?.message}`,
    );
  }
}
