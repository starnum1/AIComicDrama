"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGenService = void 0;
const common_1 = require("@nestjs/common");
let VideoGenService = class VideoGenService {
    resolveConfig(providerConfig) {
        if (!providerConfig) {
            throw new Error('未配置视频生成服务。请在「AI 服务配置」中添加一个 video_gen 类型的 Provider 并设为默认。');
        }
        return providerConfig;
    }
    async submit(request, providerConfig) {
        const { baseUrl, apiKey, model } = this.resolveConfig(providerConfig);
        const response = await fetch(baseUrl + '/video/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify({ model, first_frame_image: request.firstFrameUrl, last_frame_image: request.lastFrameUrl, prompt: request.prompt, duration: request.duration }),
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error('Video API error: ' + (data.error?.message || 'Unknown error'));
        return { taskId: data.task_id || data.id };
    }
    async getResult(taskId, providerConfig) {
        const { baseUrl, apiKey } = this.resolveConfig(providerConfig);
        const response = await fetch(baseUrl + '/video/generations/' + taskId, {
            headers: { Authorization: 'Bearer ' + apiKey },
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error('Video API error: ' + (data.error?.message || 'Unknown error'));
        return {
            status: data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'processing',
            videoUrl: data.video_url || data.output?.video_url,
            cost: data.cost,
        };
    }
    async generateAndWait(request, providerConfig, pollIntervalMs = 5000, timeoutMs = 300000) {
        const { taskId } = await this.submit(request, providerConfig);
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const result = await this.getResult(taskId, providerConfig);
            if (result.status === 'completed' || result.status === 'failed')
                return result;
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error('Video generation timeout after ' + timeoutMs + 'ms');
    }
};
exports.VideoGenService = VideoGenService;
exports.VideoGenService = VideoGenService = __decorate([
    (0, common_1.Injectable)()
], VideoGenService);
//# sourceMappingURL=video-gen.service.js.map