export interface SceneVO {
    id: string;
    name: string;
    description: string;
    visualPrompt: string;
    visualNegative: string;
    variants: Record<string, string> | null;
    episodeIds: number[];
    images: SceneImageVO[];
}
export interface SceneImageVO {
    id: string;
    variant: string;
    imageUrl: string;
}
//# sourceMappingURL=scene.d.ts.map