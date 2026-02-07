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
exports.VideoGenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let VideoGenService = class VideoGenService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.get('VIDEO_GEN_BASE_URL');
        this.apiKey = config.get('VIDEO_GEN_API_KEY');
        this.model = config.get('VIDEO_GEN_MODEL');
    }
    async submit(request) {
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
    async getResult(taskId) {
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
            status: data.status === 'completed'
                ? 'completed'
                : data.status === 'failed'
                    ? 'failed'
                    : 'processing',
            videoUrl: data.video_url || data.output?.video_url,
            cost: data.cost,
        };
    }
    async generateAndWait(request, pollIntervalMs = 5000, timeoutMs = 300000) {
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
};
exports.VideoGenService = VideoGenService;
exports.VideoGenService = VideoGenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VideoGenService);
//# sourceMappingURL=video-gen.service.js.map