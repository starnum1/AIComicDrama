export interface CharacterVO {
    id: string;
    name: string;
    description: string;
    visualPrompt: string;
    visualNegative: string;
    states: Record<string, string> | null;
    episodeIds: number[];
    sheets: CharacterSheetVO[];
    images: CharacterImageVO[];
}
/** 角色设定图（9宫格完整图） */
export interface CharacterSheetVO {
    id: string;
    imageUrl: string;
    stateName: string | null;
    gridSpec: string;
    croppedImages: CharacterImageVO[];
}
/** 从设定图裁剪出的单张角色图 */
export interface CharacterImageVO {
    id: string;
    sheetId: string | null;
    imageType: string;
    imageUrl: string;
    cropRegion: CropRegion | null;
    stateName: string | null;
}
/** 裁剪区域（像素坐标，相对于设定图原图） */
export interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}
//# sourceMappingURL=character.d.ts.map