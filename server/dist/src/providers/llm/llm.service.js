"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const common_1 = require("@nestjs/common");
let LLMService = class LLMService {
    resolveConfig(providerConfig) {
        if (!providerConfig) {
            throw new Error('未配置 LLM 服务。请在「AI 服务配置」中添加一个 llm 类型的 Provider 并设为默认。');
        }
        return providerConfig;
    }
    async chat(messages, options, providerConfig) {
        const config = this.resolveConfig(providerConfig);
        const { baseUrl, apiKey, model } = config;
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
    async chatJSON(messages, options, providerConfig) {
        const maxRetries = options?.maxRetries ?? 2;
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.chat(messages, { ...options, responseFormat: 'json' }, providerConfig);
                let parsed;
                try {
                    parsed = JSON.parse(response.content);
                }
                catch (parseErr) {
                    throw new Error('LLM JSON parse failed: ' + parseErr.message + '\nRaw: ' + response.content.slice(0, 500));
                }
                if (options?.schema) {
                    const result = options.schema.safeParse(parsed);
                    if (!result.success) {
                        const issues = result.error.issues.map((i) => '  - ' + i.path.join('.') + ': ' + i.message).join('\n');
                        throw new Error('LLM output schema validation failed:\n' + issues);
                    }
                    return { data: result.data, usage: response.usage };
                }
                return { data: parsed, usage: response.usage };
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    messages = [
                        ...messages,
                        { role: 'assistant', content: '(previous output was incorrect)' },
                        { role: 'user', content: 'Your previous output had an issue: ' + error.message + '\nPlease output correct JSON strictly.' },
                    ];
                }
            }
        }
        throw new Error('LLM JSON call failed after ' + (maxRetries + 1) + ' attempts: ' + lastError?.message);
    }
};
exports.LLMService = LLMService;
exports.LLMService = LLMService = __decorate([
    (0, common_1.Injectable)()
], LLMService);
//# sourceMappingURL=llm.service.js.map