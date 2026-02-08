import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    listProjects(req: any): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        currentStep: string;
    }[]>;
    createProject(req: any, body: {
        name: string;
    }): Promise<{
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
    getProject(req: any, id: string): Promise<{
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
    getProjectAssets(req: any, id: string): Promise<{
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
    generateCharacterImage(req: any, id: string, characterId: string, body: {
        imageProviderId?: string;
    }): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateSceneImage(req: any, id: string, sceneId: string, body: {
        variant?: string;
        imageProviderId?: string;
    }): Promise<{
        id: string;
        imageUrl: string;
    }>;
    generateAllAssets(req: any, id: string, body: {
        imageProviderId?: string;
    }): Promise<{
        generated: number;
    }>;
    deleteCharacterSheet(req: any, id: string): Promise<{
        success: boolean;
    }>;
    deleteSceneImage(req: any, id: string): Promise<{
        success: boolean;
    }>;
    getCharacterSheets(req: any, id: string): Promise<({
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
    deleteCharacterImage(req: any, id: string): Promise<{
        success: boolean;
    }>;
    getEpisodes(req: any, id: string): Promise<({
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
    updateEpisode(req: any, id: string, body: {
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
    getCharacters(req: any, id: string): Promise<({
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
    getScenes(req: any, id: string): Promise<({
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
    getShots(req: any, id: string): Promise<({
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
    updateShot(req: any, id: string, body: {
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
    getFinalVideo(req: any, id: string): Promise<{
        videoUrl: string;
        id: string;
        createdAt: Date;
        episodeId: string;
        duration: number | null;
    }>;
}
