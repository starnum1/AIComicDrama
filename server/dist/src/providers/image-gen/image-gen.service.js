"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenService = void 0;
const common_1 = require("@nestjs/common");
let ImageGenService = class ImageGenService {
    resolveConfig(providerConfig) {
        if (!providerConfig) {
            throw new Error('未配置图片生成服务。请在「AI 服务配置」中添加一个 image_gen 类型的 Provider 并设为默认。');
        }
        return providerConfig;
    }
    async generate(request, providerConfig) {
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
        let data;
        try {
            data = JSON.parse(rawText);
        }
        catch {
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
};
exports.ImageGenService = ImageGenService;
exports.ImageGenService = ImageGenService = __decorate([
    (0, common_1.Injectable)()
], ImageGenService);
//# sourceMappingURL=image-gen.service.js.map