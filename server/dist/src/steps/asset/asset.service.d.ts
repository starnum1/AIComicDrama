import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
export declare class AssetService {
    private prisma;
    private imageGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, imageGen: ImageGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void>;
    private generateCharacterSheet;
    private generateSingleSheet;
    private buildCharacterSheetPrompt;
    cropFromSheet(sheetId: string, imageType: string, cropRegion: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Promise<{
        id: string;
        imageUrl: string;
    }>;
    regenerateCharacterSheet(sheetId: string): Promise<void>;
    private generateSceneImages;
}
