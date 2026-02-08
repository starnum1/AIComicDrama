import { PrismaService } from '../common/prisma.service';
import { PipelineOrchestrator } from '../pipeline/pipeline.orchestrator';
export declare class ProjectsService {
    private prisma;
    private orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: PipelineOrchestrator);
    listProjects(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        currentStep: string;
    }[]>;
    createProject(userId: string, name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        status: string;
        currentStep: string;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    getProject(userId: string, projectId: string): Promise<{
        novel: {
            id: string;
            createdAt: Date;
            originalText: string;
            charCount: number;
        } | null;
        _count: {
            characters: number;
            scenes: number;
            episodes: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        status: string;
        currentStep: string;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    deleteProject(userId: string, projectId: string): Promise<{
        success: boolean;
    }>;
    updateAiConfig(userId: string, projectId: string, config: {
        llmProviderId?: string | null;
        imageProviderId?: string | null;
        videoProviderId?: string | null;
    }): Promise<{
        id: string;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    uploadNovel(userId: string, projectId: string, text: string): Promise<{
        id: string;
        charCount: number;
    }>;
    startPipeline(userId: string, projectId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmAssets(userId: string, projectId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    continueStep(userId: string, projectId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    restartStep(userId: string, projectId: string, step: string): Promise<{
        success: boolean;
        message: string;
    }>;
    retryShot(userId: string, shotId: string, step: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCharacterSheets(userId: string, projectId: string): Promise<({
        sheets: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            stateName: string | null;
            gridSpec: string;
        }[];
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            sheetId: string | null;
            imageType: string;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
            stateName: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
    })[]>;
    regenerateSheet(userId: string, sheetId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    cropSheet(userId: string, sheetId: string, imageType: string, cropRegion: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string;
        characterId: string;
        sheetId: string | null;
        imageType: string;
        cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
        stateName: string | null;
    }>;
    deleteCharacterImage(userId: string, imageId: string): Promise<{
        success: boolean;
    }>;
    getEpisodes(userId: string, projectId: string): Promise<({
        finalVideo: {
            id: string;
            videoUrl: string;
            duration: number | null;
        } | null;
        _count: {
            shots: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        originalText: string;
        sortOrder: number;
        episodeNumber: number;
        title: string;
        summary: string;
        characterIds: import("@prisma/client/runtime/client").JsonValue;
        sceneIds: import("@prisma/client/runtime/client").JsonValue;
        emotionCurve: string | null;
        endingHook: string | null;
    })[]>;
    updateEpisode(userId: string, episodeId: string, data: {
        title?: string;
        summary?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        originalText: string;
        sortOrder: number;
        episodeNumber: number;
        title: string;
        summary: string;
        characterIds: import("@prisma/client/runtime/client").JsonValue;
        sceneIds: import("@prisma/client/runtime/client").JsonValue;
        emotionCurve: string | null;
        endingHook: string | null;
    }>;
    getCharacters(userId: string, projectId: string): Promise<({
        sheets: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            stateName: string | null;
            gridSpec: string;
        }[];
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            sheetId: string | null;
            imageType: string;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
            stateName: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
    })[]>;
    getScenes(userId: string, projectId: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            sceneId: string;
            variant: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
        variants: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    getShots(userId: string, episodeId: string): Promise<({
        scene: {
            id: string;
            name: string;
        };
        characters: ({
            character: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                projectId: string;
                description: string;
                visualPrompt: string;
                visualNegative: string;
                voiceDesc: string | null;
                states: import("@prisma/client/runtime/client").JsonValue | null;
                episodeIds: import("@prisma/client/runtime/client").JsonValue;
                sortOrder: number;
            };
        } & {
            id: string;
            characterId: string;
            characterState: string | null;
            shotId: string;
        })[];
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            shotId: string;
            imageType: string;
        }[];
        video: {
            id: string;
            createdAt: Date;
            videoUrl: string;
            shotId: string;
            actualDuration: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        sceneId: string;
        shotNumber: number;
        duration: number;
        shotType: string;
        cameraMovement: string;
        imagePrompt: string;
        imageNegative: string;
        videoMotion: string;
        sceneVariant: string;
        dialogue: import("@prisma/client/runtime/client").JsonValue | null;
        narration: import("@prisma/client/runtime/client").JsonValue | null;
        sfx: import("@prisma/client/runtime/client").JsonValue | null;
        transitionIn: string;
        transitionOut: string;
        continuityStrength: string;
        episodeId: string;
    })[]>;
    updateShot(userId: string, shotId: string, data: {
        imagePrompt?: string;
        duration?: number;
        shotType?: string;
        cameraMovement?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        sceneId: string;
        shotNumber: number;
        duration: number;
        shotType: string;
        cameraMovement: string;
        imagePrompt: string;
        imageNegative: string;
        videoMotion: string;
        sceneVariant: string;
        dialogue: import("@prisma/client/runtime/client").JsonValue | null;
        narration: import("@prisma/client/runtime/client").JsonValue | null;
        sfx: import("@prisma/client/runtime/client").JsonValue | null;
        transitionIn: string;
        transitionOut: string;
        continuityStrength: string;
        episodeId: string;
    }>;
    getFinalVideo(userId: string, episodeId: string): Promise<{
        id: string;
        createdAt: Date;
        videoUrl: string;
        duration: number | null;
        episodeId: string;
    }>;
    private verifyProjectOwnership;
}
