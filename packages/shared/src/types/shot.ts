export interface ShotDialogue {
  speaker: string;
  text: string;
  emotion: string;
}

export interface ShotNarration {
  text: string;
  emotion: string;
}

export interface ShotVO {
  id: string;
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
  dialogue: ShotDialogue[] | null;
  narration: ShotNarration | null;
  sfx: string[];
  transitionIn: string;
  transitionOut: string;
  continuityStrength: string;
  images: ShotImageVO[];
  video: ShotVideoVO | null;
}

export interface ShotImageVO {
  id: string;
  imageType: string;  // first_frame / last_frame / key_frame
  imageUrl: string;
}

export interface ShotVideoVO {
  id: string;
  videoUrl: string;
  actualDuration: number | null;
}
