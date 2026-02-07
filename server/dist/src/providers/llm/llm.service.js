"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let LLMService = class LLMService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.get('LLM_BASE_URL');
        this.apiKey = config.get('LLM_API_KEY');
        this.model = config.get('LLM_MODEL');
    }
    async chat(messages, options) {
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
                response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
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
    async chatJSON(messages, options) {
        const maxRetries = options?.maxRetries ?? 2;
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.chat(messages, {
                    ...options,
                    responseFormat: 'json',
                });
                let parsed;
                try {
                    parsed = JSON.parse(response.content);
                }
                catch (parseErr) {
                    throw new Error(`LLM 返回的 JSON 无法解析: ${parseErr.message}\n原始内容: ${response.content.slice(0, 500)}`);
                }
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
                return { data: parsed, usage: response.usage };
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    messages = [
                        ...messages,
                        { role: 'assistant', content: '(上次输出有误)' },
                        {
                            role: 'user',
                            content: `你上次的输出有问题：${error.message}\n请严格按照要求重新输出正确的JSON。`,
                        },
                    ];
                }
            }
        }
        throw new Error(`LLM JSON 调用在 ${maxRetries + 1} 次尝试后仍然失败: ${lastError?.message}`);
    }
};
exports.LLMService = LLMService;
exports.LLMService = LLMService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LLMService);
//# sourceMappingURL=llm.service.js.map