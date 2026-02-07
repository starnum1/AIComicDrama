import { ConfigService } from '@nestjs/config';
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
    private config;
    private baseUrl;
    private apiKey;
    private model;
    constructor(config: ConfigService);
    chat(messages: LLMChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        responseFormat?: 'json' | 'text';
    }): Promise<LLMResponse>;
    chatJSON<T>(messages: LLMChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        schema?: import('zod').ZodType<T>;
        maxRetries?: number;
    }): Promise<{
        data: T;
        usage: LLMResponse['usage'];
    }>;
}
