/** 服务端 → 客户端 WebSocket 事件 */
export type WsServerEvent =
  // ===== 步骤级事件 =====
  | { event: 'step:start'; data: { step: string } }
  | { event: 'step:complete'; data: { step: string } }
  | { event: 'step:need_review'; data: { step: string } }
  | { event: 'step:failed'; data: { step: string; error: string } }
  // ===== 细粒度进度事件 =====
  | { event: 'progress:detail'; data: {
      step: string;           // 当前步骤
      message: string;        // 人类可读的进度描述（如"正在生成角色定妆照 3/8"）
      completed: number;      // 已完成数量
      total: number;          // 总数量
      entityType?: string;    // 实体类型（character/scene/episode/shot）
      entityId?: string;      // 实体ID
    } }
  // ===== 资产生成事件 =====
  | { event: 'asset:character:sheet'; data: { characterId: string; sheetUrl: string; stateName: string | null } }
  | { event: 'asset:scene:complete'; data: { sceneId: string } }
  // ===== 分镜生成事件 =====
  | { event: 'storyboard:episode:complete'; data: { episodeId: string; episodeNumber: number; shotCount: number } }
  // ===== 锚点/视频生成事件 =====
  | { event: 'anchor:shot:complete'; data: { shotId: string; firstFrameUrl: string; lastFrameUrl: string } }
  | { event: 'video:shot:complete'; data: { shotId: string; episodeId: string; videoUrl: string } }
  // ===== 组装/完成事件 =====
  | { event: 'assembly:episode:complete'; data: { episodeId: string; episodeNumber: number; videoUrl: string } }
  | { event: 'project:complete'; data: Record<string, never> }
  // ===== 错误事件 =====
  | { event: 'error'; data: { message: string } };

/** 客户端 → 服务端 WebSocket 事件 */
export type WsClientEvent =
  | { event: 'subscribe'; data: { projectId: string } }
  | { event: 'unsubscribe'; data: { projectId: string } };
