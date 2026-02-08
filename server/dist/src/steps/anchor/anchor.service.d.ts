import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
export declare class AnchorService {
    private prisma;
    private imageGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, imageGen: ImageGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void>;
    generateForShot(shotId: string, imageConfig?: AiProviderConfig): Promise<void>;
    private selectReference;
    private getReferenceStrength;
}
