import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
export declare class StoryboardService {
    private prisma;
    private llm;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, llm: LLMService, ws: WsGateway);
    execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void>;
    private generateForEpisode;
    private buildSystemPrompt;
    private buildUserPrompt;
}
