import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';
export declare class AnalysisService {
    private prisma;
    private llm;
    private ws;
    private readonly logger;
    constructor(prisma: PrismaService, llm: LLMService, ws: WsGateway);
    execute(projectId: string): Promise<void>;
    private buildExtractSystemPrompt;
    private buildEpisodeSystemPrompt;
    private buildEpisodeUserPrompt;
    private extractOriginalText;
    private fuzzyIndexOf;
}
