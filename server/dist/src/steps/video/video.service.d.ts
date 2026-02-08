import { PrismaService } from '../../common/prisma.service';
import { VideoGenService } from '../../providers/video-gen/video-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
export declare class VideoService {
    private prisma;
    private videoGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, videoGen: VideoGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void>;
    generateForShot(shotId: string, videoConfig?: AiProviderConfig): Promise<void>;
}
