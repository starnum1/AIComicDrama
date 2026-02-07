/** 服务端 → 客户端 WebSocket 事件 */
export type WsServerEvent = {
    event: 'step:start';
    data: {
        step: string;
    };
} | {
    event: 'step:complete';
    data: {
        step: string;
    };
} | {
    event: 'step:need_review';
    data: {
        step: string;
    };
} | {
    event: 'step:failed';
    data: {
        step: string;
        error: string;
    };
} | {
    event: 'progress:detail';
    data: {
        step: string;
        message: string;
        completed: number;
        total: number;
        entityType?: string;
        entityId?: string;
    };
} | {
    event: 'asset:character:sheet';
    data: {
        characterId: string;
        sheetUrl: string;
        stateName: string | null;
    };
} | {
    event: 'asset:scene:complete';
    data: {
        sceneId: string;
    };
} | {
    event: 'storyboard:episode:complete';
    data: {
        episodeId: string;
        episodeNumber: number;
        shotCount: number;
    };
} | {
    event: 'anchor:shot:complete';
    data: {
        shotId: string;
        firstFrameUrl: string;
        lastFrameUrl: string;
    };
} | {
    event: 'video:shot:complete';
    data: {
        shotId: string;
        episodeId: string;
        videoUrl: string;
    };
} | {
    event: 'assembly:episode:complete';
    data: {
        episodeId: string;
        episodeNumber: number;
        videoUrl: string;
    };
} | {
    event: 'project:complete';
    data: Record<string, never>;
} | {
    event: 'error';
    data: {
        message: string;
    };
};
/** 客户端 → 服务端 WebSocket 事件 */
export type WsClientEvent = {
    event: 'subscribe';
    data: {
        projectId: string;
    };
} | {
    event: 'unsubscribe';
    data: {
        projectId: string;
    };
};
//# sourceMappingURL=ws-events.d.ts.map