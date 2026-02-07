import type { ShotVO } from './shot';
export interface EpisodeVO {
    id: string;
    episodeNumber: number;
    title: string;
    summary: string;
    originalText: string;
    emotionCurve: string | null;
    endingHook: string | null;
    shots?: ShotVO[];
}
//# sourceMappingURL=episode.d.ts.map