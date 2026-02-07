import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
export declare class AnchorService {
    private prisma;
    private imageGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, imageGen: ImageGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string): Promise<void>;
    generateForShot(shotId: string): Promise<void>;
    private selectReference;
    private getReferenceStrength;
}
