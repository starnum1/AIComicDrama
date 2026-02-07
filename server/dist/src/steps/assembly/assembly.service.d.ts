import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
export declare class AssemblyService {
    private prisma;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService, ws: WsGateway);
    execute(projectId: string): Promise<void>;
    private assembleEpisode;
    private generateSRT;
    private formatSRTTime;
}
