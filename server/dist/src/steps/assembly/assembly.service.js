"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssemblyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssemblyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma.service");
const storage_service_1 = require("../../providers/storage/storage.service");
const ws_gateway_1 = require("../../common/ws.gateway");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let AssemblyService = AssemblyService_1 = class AssemblyService {
    constructor(prisma, storage, ws) {
        this.prisma = prisma;
        this.storage = storage;
        this.ws = ws;
        this.logger = new common_1.Logger(AssemblyService_1.name);
    }
    async execute(projectId, _aiConfigs) {
        const episodes = await this.prisma.episode.findMany({
            where: { projectId },
            include: {
                shots: {
                    include: { video: true },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        for (const episode of episodes) {
            await this.assembleEpisode(projectId, episode);
        }
    }
    async assembleEpisode(projectId, episode) {
        const tmpDir = path.join(os.tmpdir(), `aicomic-${projectId}-ep${episode.episodeNumber}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        try {
            const videoFiles = [];
            for (let i = 0; i < episode.shots.length; i++) {
                const shot = episode.shots[i];
                if (!shot.video) {
                    this.logger.warn(`Shot ${shot.id} has no video, skipping`);
                    continue;
                }
                const localPath = path.join(tmpDir, `shot_${String(i).padStart(3, '0')}.mp4`);
                const response = await fetch(shot.video.videoUrl);
                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(localPath, buffer);
                videoFiles.push(localPath);
            }
            if (videoFiles.length === 0) {
                throw new Error(`Episode ${episode.episodeNumber} has no video files`);
            }
            const srtPath = path.join(tmpDir, 'subtitles.srt');
            const srtContent = this.generateSRT(episode.shots);
            fs.writeFileSync(srtPath, srtContent, 'utf-8');
            const concatListPath = path.join(tmpDir, 'concat_list.txt');
            const concatContent = videoFiles.map((f) => `file '${f}'`).join('\n');
            fs.writeFileSync(concatListPath, concatContent);
            const outputPath = path.join(tmpDir, 'final.mp4');
            await execFileAsync('ffmpeg', [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                concatListPath,
                '-vf',
                `subtitles=${srtPath}:force_style='FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`,
                '-c:v',
                'libx264',
                '-c:a',
                'aac',
                '-preset',
                'fast',
                '-y',
                outputPath,
            ]);
            const videoBuffer = fs.readFileSync(outputPath);
            const storagePath = this.storage.generatePath(projectId, 'finals', 'mp4');
            const finalUrl = await this.storage.uploadBuffer(videoBuffer, storagePath, 'video/mp4');
            await this.prisma.finalVideo.create({
                data: {
                    episodeId: episode.id,
                    videoUrl: finalUrl,
                },
            });
            this.ws.emitToProject(projectId, 'assembly:episode:complete', {
                episodeId: episode.id,
                episodeNumber: episode.episodeNumber,
                videoUrl: finalUrl,
            });
            this.logger.log(`Episode ${episode.episodeNumber} assembled: ${finalUrl}`);
        }
        finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }
    generateSRT(shots) {
        const entries = [];
        let index = 1;
        let currentTime = 0;
        for (const shot of shots) {
            const shotStart = currentTime;
            const subtitleItems = [];
            const dialogues = shot.dialogue;
            if (dialogues) {
                for (const d of dialogues) {
                    subtitleItems.push({ text: `${d.speaker}：${d.text}` });
                }
            }
            const narration = shot.narration;
            if (narration) {
                subtitleItems.push({ text: narration.text });
            }
            if (subtitleItems.length > 0) {
                const sliceDuration = shot.duration / subtitleItems.length;
                for (let i = 0; i < subtitleItems.length; i++) {
                    const sliceStart = shotStart + sliceDuration * i;
                    const sliceEnd = shotStart + sliceDuration * (i + 1);
                    entries.push(`${index}\n` +
                        `${this.formatSRTTime(sliceStart)} --> ${this.formatSRTTime(sliceEnd)}\n` +
                        `${subtitleItems[i].text}\n`);
                    index++;
                }
            }
            currentTime += shot.duration;
        }
        return entries.join('\n');
    }
    formatSRTTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }
};
exports.AssemblyService = AssemblyService;
exports.AssemblyService = AssemblyService = AssemblyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        ws_gateway_1.WsGateway])
], AssemblyService);
//# sourceMappingURL=assembly.service.js.map