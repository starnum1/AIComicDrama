import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';
export declare class AssetService {
    private prisma;
    private llm;
    private imageGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, llm: LLMService, imageGen: ImageGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void>;
    generateCharacterTurnaround(characterId: string, imageConfig?: AiProviderConfig): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateSceneAnchor(sceneId: string, variant?: string, imageConfig?: AiProviderConfig): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateAllMissing(projectId: string, imageConfig?: AiProviderConfig): Promise<{
        generated: number;
    }>;
    private buildExtractSystemPrompt;
    private buildTurnaroundPrompt;
}
