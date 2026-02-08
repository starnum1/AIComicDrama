import { PrismaService } from '../common/prisma.service';
import { PipelineOrchestrator } from '../pipeline/pipeline.orchestrator';
import { AssetService } from '../steps/asset/asset.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
export declare class ProjectsService {
    private prisma;
    private orchestrator;
    private assetService;
    private aiProvidersService;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: PipelineOrchestrator, assetService: AssetService, aiProvidersService: AiProvidersService);
    listProjects(userId: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        currentStep: string;
    }[]>;
    createProject(userId: string, name: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        currentStep: string;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    getProject(userId: string, projectId: string): Promise<{
        _count: {
            characters: number;
            episodes: number;
            scenes: number;
        };
        novel: {
            id: string;
            originalText: string;
            createdAt: Date;
            charCount: number;
        } | null;
    } & {
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
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
    getProjectAssets(userId: string, projectId: string): Promise<{
        characters: ({
            images: {
                id: string;
                createdAt: Date;
                imageType: string;
                imageUrl: string;
                characterId: string;
                sheetId: string | null;
                cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
                stateName: string | null;
            }[];
            sheets: {
                id: string;
                createdAt: Date;
                imageUrl: string;
                characterId: string;
                stateName: string | null;
                gridSpec: string;
            }[];
        } & {
            id: string;
            projectId: string;
            sortOrder: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string;
            visualPrompt: string;
            visualNegative: string;
            voiceDesc: string | null;
            states: import("@prisma/client/runtime/client").JsonValue | null;
            episodeIds: import("@prisma/client/runtime/client").JsonValue;
        })[];
        scenes: ({
            images: {
                id: string;
                createdAt: Date;
                sceneId: string;
                imageUrl: string;
                variant: string;
            }[];
        } & {
            id: string;
            projectId: string;
            sortOrder: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string;
            visualPrompt: string;
            visualNegative: string;
            episodeIds: import("@prisma/client/runtime/client").JsonValue;
            variants: import("@prisma/client/runtime/client").JsonValue | null;
        })[];
    }>;
    getCharacterSheets(userId: string, projectId: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            imageType: string;
            imageUrl: string;
            characterId: string;
            sheetId: string | null;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
            stateName: string | null;
        }[];
        sheets: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            stateName: string | null;
            gridSpec: string;
        }[];
    } & {
        id: string;
        projectId: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
    })[]>;
    generateCharacterImage(userId: string, projectId: string, characterId: string, imageProviderId?: string): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateSceneImage(userId: string, projectId: string, sceneId: string, variant: string, imageProviderId?: string): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateAllAssets(userId: string, projectId: string, imageProviderId?: string): Promise<{
        generated: number;
    }>;
    deleteCharacterSheet(userId: string, sheetId: string): Promise<{
        success: boolean;
    }>;
    deleteSceneImage(userId: string, imageId: string): Promise<{
        success: boolean;
    }>;
    deleteCharacterImage(userId: string, imageId: string): Promise<{
        success: boolean;
    }>;
    private resolveImageConfig;
    getEpisodes(userId: string, projectId: string): Promise<({
        finalVideo: {
            videoUrl: string;
            id: string;
            duration: number | null;
        } | null;
        _count: {
            shots: number;
        };
    } & {
        id: string;
        projectId: string;
        episodeNumber: number;
        title: string;
        summary: string;
        originalText: string;
        characterIds: import("@prisma/client/runtime/client").JsonValue;
        sceneIds: import("@prisma/client/runtime/client").JsonValue;
        emotionCurve: string | null;
        endingHook: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateEpisode(userId: string, episodeId: string, data: {
        title?: string;
        summary?: string;
    }): Promise<{
        id: string;
        projectId: string;
        episodeNumber: number;
        title: string;
        summary: string;
        originalText: string;
        characterIds: import("@prisma/client/runtime/client").JsonValue;
        sceneIds: import("@prisma/client/runtime/client").JsonValue;
        emotionCurve: string | null;
        endingHook: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getCharacters(userId: string, projectId: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            imageType: string;
            imageUrl: string;
            characterId: string;
            sheetId: string | null;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
            stateName: string | null;
        }[];
        sheets: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            characterId: string;
            stateName: string | null;
            gridSpec: string;
        }[];
    } & {
        id: string;
        projectId: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
    })[]>;
    getScenes(userId: string, projectId: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            sceneId: string;
            imageUrl: string;
            variant: string;
        }[];
    } & {
        id: string;
        projectId: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        variants: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    getShots(userId: string, episodeId: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            shotId: string;
            imageType: string;
            imageUrl: string;
        }[];
        scene: {
            id: string;
            name: string;
        };
        characters: ({
            character: {
                id: string;
                projectId: string;
                sortOrder: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string;
                visualPrompt: string;
                visualNegative: string;
                voiceDesc: string | null;
                states: import("@prisma/client/runtime/client").JsonValue | null;
                episodeIds: import("@prisma/client/runtime/client").JsonValue;
            };
        } & {
            id: string;
            shotId: string;
            characterId: string;
            characterState: string | null;
        })[];
        video: {
            videoUrl: string;
            id: string;
            createdAt: Date;
            shotId: string;
            actualDuration: number | null;
        } | null;
    } & {
        id: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        episodeId: string;
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
    })[]>;
    updateShot(userId: string, shotId: string, data: {
        imagePrompt?: string;
        duration?: number;
        shotType?: string;
        cameraMovement?: string;
    }): Promise<{
        id: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        episodeId: string;
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
    }>;
    getFinalVideo(userId: string, episodeId: string): Promise<{
        videoUrl: string;
        id: string;
        createdAt: Date;
        episodeId: string;
        duration: number | null;
    }>;
    private verifyProjectOwnership;
}
