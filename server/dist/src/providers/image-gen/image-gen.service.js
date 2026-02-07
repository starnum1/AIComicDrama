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
exports.ImageGenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ImageGenService = class ImageGenService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.get('IMAGE_GEN_BASE_URL');
        this.apiKey = config.get('IMAGE_GEN_API_KEY');
        this.model = config.get('IMAGE_GEN_MODEL');
    }
    async generate(request) {
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
};
exports.ImageGenService = ImageGenService;
exports.ImageGenService = ImageGenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ImageGenService);
//# sourceMappingURL=image-gen.service.js.map