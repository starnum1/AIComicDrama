import { PrismaService } from '../../common/prisma.service';
import { VideoGenService } from '../../providers/video-gen/video-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
export declare class VideoService {
    private prisma;
    private videoGen;
    private storage;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, videoGen: VideoGenService, storage: StorageService, ws: WsGateway);
    execute(projectId: string): Promise<void>;
    generateForShot(shotId: string): Promise<void>;
}
