import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
export interface LLMChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LLMResponse {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export declare class LLMService {
    private resolveConfig;
    chat(messages: LLMChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        responseFormat?: 'json' | 'text';
    }, providerConfig?: AiProviderConfig): Promise<LLMResponse>;
    chatJSON<T>(messages: LLMChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        schema?: import('zod').ZodType<T>;
        maxRetries?: number;
    }, providerConfig?: AiProviderConfig): Promise<{
        data: T;
        usage: LLMResponse['usage'];
    }>;
}
