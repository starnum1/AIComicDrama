import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    listProjects(req: any): Promise<{
        id: string;
        name: string;
        status: string;
        currentStep: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createProject(req: any, body: {
        name: string;
    }): Promise<{
        id: string;
        userId: string;
        name: string;
        status: string;
        currentStep: string;
        createdAt: Date;
        updatedAt: Date;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    getProject(req: any, id: string): Promise<{
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
        userId: string;
        name: string;
        status: string;
        currentStep: string;
        createdAt: Date;
        updatedAt: Date;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    deleteProject(req: any, id: string): Promise<{
        success: boolean;
    }>;
    updateAiConfig(req: any, id: string, body: {
        llmProviderId?: string | null;
        imageProviderId?: string | null;
        videoProviderId?: string | null;
    }): Promise<{
        id: string;
        llmProviderId: string | null;
        imageProviderId: string | null;
        videoProviderId: string | null;
    }>;
    uploadNovel(req: any, id: string, body: {
        text: string;
    }): Promise<{
        id: string;
        charCount: number;
    }>;
    startPipeline(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmAssets(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    continueStep(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    restartStep(req: any, id: string, step: string): Promise<{
        success: boolean;
        message: string;
    }>;
    retryShot(req: any, id: string, step: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCharacterSheets(req: any, id: string): Promise<({
        sheets: {
            id: string;
            createdAt: Date;
            characterId: string;
            imageUrl: string;
            stateName: string | null;
            gridSpec: string;
        }[];
        images: {
            id: string;
            createdAt: Date;
            characterId: string;
            imageUrl: string;
            stateName: string | null;
            sheetId: string | null;
            imageType: string;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
    })[]>;
    regenerateSheet(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    cropSheet(req: any, id: string, body: {
        imageType: string;
        cropRegion: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        characterId: string;
        imageUrl: string;
        stateName: string | null;
        sheetId: string | null;
        imageType: string;
        cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    deleteCharacterImage(req: any, id: string): Promise<{
        success: boolean;
    }>;
    getEpisodes(req: any, id: string): Promise<({
        _count: {
            shots: number;
        };
        finalVideo: {
            id: string;
            videoUrl: string;
            duration: number | null;
        } | null;
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
    updateEpisode(req: any, id: string, body: {
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
    getCharacters(req: any, id: string): Promise<({
        sheets: {
            id: string;
            createdAt: Date;
            characterId: string;
            imageUrl: string;
            stateName: string | null;
            gridSpec: string;
        }[];
        images: {
            id: string;
            createdAt: Date;
            characterId: string;
            imageUrl: string;
            stateName: string | null;
            sheetId: string | null;
            imageType: string;
            cropRegion: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        voiceDesc: string | null;
        states: import("@prisma/client/runtime/client").JsonValue | null;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
    })[]>;
    getScenes(req: any, id: string): Promise<({
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            sceneId: string;
            variant: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        description: string;
        visualPrompt: string;
        visualNegative: string;
        episodeIds: import("@prisma/client/runtime/client").JsonValue;
        sortOrder: number;
        variants: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    getShots(req: any, id: string): Promise<({
        characters: ({
            character: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
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
            shotId: string;
            characterState: string | null;
        })[];
        images: {
            id: string;
            createdAt: Date;
            imageUrl: string;
            imageType: string;
            shotId: string;
        }[];
        scene: {
            id: string;
            name: string;
        };
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
        episodeId: string;
        duration: number;
        sceneId: string;
        shotNumber: number;
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
    updateShot(req: any, id: string, body: {
        imagePrompt?: string;
        duration?: number;
        shotType?: string;
        cameraMovement?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sortOrder: number;
        episodeId: string;
        duration: number;
        sceneId: string;
        shotNumber: number;
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
    getFinalVideo(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        episodeId: string;
        videoUrl: string;
        duration: number | null;
    }>;
}
