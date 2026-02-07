export interface CharacterVO {
  id: string;
  name: string;
  description: string;
  visualPrompt: string;
  visualNegative: string;
  states: Record<string, string> | null;
  episodeIds: number[];
  sheets: CharacterSheetVO[];    // 9宫格设定图
  images: CharacterImageVO[];    // 从设定图裁剪出的子图
}

/** 角色设定图（9宫格完整图） */
export interface CharacterSheetVO {
  id: string;
  imageUrl: string;
  stateName: string | null;
  gridSpec: string;              // "3x3"
  croppedImages: CharacterImageVO[];  // 从此设定图裁剪出的子图
}

/** 从设定图裁剪出的单张角色图 */
export interface CharacterImageVO {
  id: string;
  sheetId: string | null;
  imageType: string;             // front/side/expression_happy...
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
