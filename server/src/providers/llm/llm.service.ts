import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

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
  private defaultBaseUrl: string;
  private defaultApiKey: string;
  private defaultModel: string;

  constructor(private config: ConfigService) {
    this.defaultBaseUrl = config.get('LLM_BASE_URL')!;
    this.defaultApiKey = config.get('LLM_API_KEY')!;
    this.defaultModel = config.get('LLM_MODEL')!;
  }

  async chat(
    messages: LLMChatMessage[],
    options?: { temperature?: number; maxTokens?: number; responseFormat?: 'json' | 'text' },
    providerConfig?: AiProviderConfig,
  ): Promise<LLMResponse> {
    const baseUrl = providerConfig?.baseUrl ?? this.defaultBaseUrl;
    const apiKey = providerConfig?.apiKey ?? this.defaultApiKey;
    const model = providerConfig?.model ?? this.defaultModel;

    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 16000,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error('LLM API error: ' + (data.error?.message || 'Unknown error'));
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

  async chatJSON<T>(
    messages: LLMChatMessage[],
    options?: { temperature?: number; maxTokens?: number; schema?: import('zod').ZodType<T>; maxRetries?: number },
    providerConfig?: AiProviderConfig,
  ): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    const maxRetries = options?.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.chat(messages, { ...options, responseFormat: 'json' }, providerConfig);

        let parsed: unknown;
        try {
          parsed = JSON.parse(response.content);
        } catch (parseErr) {
          throw new Error('LLM JSON parse failed: ' + (parseErr as Error).message + '\nRaw: ' + response.content.slice(0, 500));
        }

        if (options?.schema) {
          const result = options.schema.safeParse(parsed);
          if (!result.success) {
            const issues = result.error.issues.map((i) => '  - ' + i.path.join('.') + ': ' + i.message).join('\n');
            throw new Error('LLM output schema validation failed:\n' + issues);
          }
          return { data: result.data, usage: response.usage };
        }

        return { data: parsed as T, usage: response.usage };
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          messages = [
            ...messages,
            { role: 'assistant' as const, content: '(previous output was incorrect)' },
            { role: 'user' as const, content: 'Your previous output had an issue: ' + (error as Error).message + '\nPlease output correct JSON strictly.' },
          ];
        }
      }
    }

    throw new Error('LLM JSON call failed after ' + (maxRetries + 1) + ' attempts: ' + lastError?.message);
  }
}
