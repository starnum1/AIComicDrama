import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';

interface StoryboardResult {
  shots: {
    shot_number: number;
    duration: number;
    shot_type: string;
    camera_movement: string;
    image_prompt: string;
    image_negative: string;
    video_motion: string;
    scene_name: string;
    scene_variant: string;
    characters_in_frame: { name: string; state?: string }[];
    dialogue: { speaker: string; text: string; emotion: string }[] | null;
    narration: { text: string; emotion: string } | null;
    sfx: string[];
    transition_in: string;
    transition_out: string;
    continuity_strength: string;
  }[];
}

@Injectable()
export class StoryboardService {
  private readonly logger = new Logger(StoryboardService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    const llmConfig = aiConfigs?.llm;
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });

    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });

    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
    });

    // 逐集生成分镜（串行，避免LLM并发过高导致上下文混乱）
    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];

      this.ws.emitToProject(projectId, 'progress:detail', {
        step: 'storyboard',
        message: `分镜生成中：第${episode.episodeNumber}集（${i + 1}/${episodes.length}）`,
        completed: i,
        total: episodes.length,
        entityType: 'episode',
        entityId: episode.id,
      });

      const shotCount = await this.generateForEpisode(projectId, episode, characters, scenes, llmConfig);

      this.ws.emitToProject(projectId, 'storyboard:episode:complete', {
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        shotCount,
      });
    }
  }

  private async generateForEpisode(
    projectId: string,
    episode: any,
    characters: any[],
    scenes: any[],
    llmConfig?: import('../../ai-providers/ai-providers.service').AiProviderConfig,
  ): Promise<number> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(episode, characters, scenes);

    const { data: result } = await this.llm.chatJSON<StoryboardResult>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 16000,
      },
      llmConfig,
    );

    // 构建名称到ID的映射
    const characterMap = new Map(characters.map((c) => [c.name, c.id]));
    const sceneMap = new Map(scenes.map((s) => [s.name, s.id]));

    // 存储镜头
    for (const shot of result.shots) {
      const sceneId = sceneMap.get(shot.scene_name);
      if (!sceneId) {
        this.logger.warn(`场景 "${shot.scene_name}" 未找到，跳过镜头 ${shot.shot_number}`);
        continue;
      }

      const createdShot = await this.prisma.shot.create({
        data: {
          episodeId: episode.id,
          sceneId,
          shotNumber: shot.shot_number,
          duration: shot.duration,
          shotType: shot.shot_type,
          cameraMovement: shot.camera_movement,
          imagePrompt: shot.image_prompt,
          imageNegative: shot.image_negative,
          videoMotion: shot.video_motion,
          sceneVariant: shot.scene_variant || 'default',
          dialogue: shot.dialogue ?? Prisma.JsonNull,
          narration: shot.narration ?? Prisma.JsonNull,
          sfx: shot.sfx,
          transitionIn: shot.transition_in,
          transitionOut: shot.transition_out,
          continuityStrength: shot.continuity_strength,
          sortOrder: shot.shot_number,
        },
      });

      // 创建镜头-角色关联
      for (const charRef of shot.characters_in_frame) {
        const characterId = characterMap.get(charRef.name);
        if (characterId) {
          await this.prisma.shotCharacter.create({
            data: {
              shotId: createdShot.id,
              characterId,
              characterState: charRef.state || null,
            },
          });
        }
      }
    }

    this.logger.log(
      `Episode ${episode.episodeNumber} - 生成 ${result.shots.length} 个镜头`,
    );

    return result.shots.length;
  }

  // ==================== 提示词模板 ====================

  private buildSystemPrompt(): string {
    return `你是一位专业的3D动漫短剧分镜导演。你的任务是将一集短剧的原文内容转化为AI可执行的分镜指令序列。

## 核心规则

1. **镜头时长**：每个镜头 4-12 秒，严格遵守此范围
2. **画面描述**：image_prompt 必须是完整的英文描述，直接可用于AI图片生成
   - 必须包含 "3d anime style, cel-shading" 前缀
   - 必须包含画面中角色的完整视觉特征（从角色设定中复制，不要省略）
   - 必须包含场景细节、光照、构图、氛围
   - 必须标明镜头景别（wide shot / medium shot / close-up 等）
3. **视频运动**：video_motion 描述画面中的运动和动作，英文
4. **连贯性标注**：
   - strong：同一动作的延续（如角色走路的连续镜头），视觉上需要严格衔接
   - medium：同一场景不同视角（如从全景切到特写），保持角色和场景一致即可
   - weak：换场景或时间跳跃，可用转场过渡
5. **转场**：
   - cut：硬切（最常用）
   - dissolve：叠化过渡
   - fade_in / fade_out：淡入淡出
   - smash_cut：猛切（用于惊吓、意外）
6. **内心独白处理**：小说中的第一人称内心活动转化为旁白（narration字段）或表情特写镜头
7. **节奏**：短剧节奏要快，开场镜头必须在5秒内抓住注意力。恐怖/悬疑场景可适当放慢节奏，利用留白制造紧张感
8. **不要生成对白的音频描述**：对白仅提供文本和情绪标注

## 镜头类型参考
- wide：全景，展示完整场景
- medium：中景，人物膝盖以上
- close_up：近景/特写，面部或手部
- extreme_close_up：极特写，眼睛或某个细节
- over_shoulder：过肩镜头
- low_angle：低角度仰拍
- high_angle：高角度俯拍
- pov：主观视角

## 运镜参考
- static：固定不动
- push_in：推进（靠近主体）
- pull_out：拉远
- pan_left / pan_right：水平左/右摇
- tilt_up / tilt_down：垂直上/下摇
- follow：跟随主体移动
- handheld：手持微晃（紧张感）

## 输出格式

严格JSON格式：
{
  "shots": [
    {
      "shot_number": 1,
      "duration": 6,
      "shot_type": "wide",
      "camera_movement": "static",
      "image_prompt": "3d anime style, cel-shading, wide shot, ...(完整英文画面描述)...",
      "image_negative": "realistic, photographic, ...",
      "video_motion": "...(英文运动描述)...",
      "scene_name": "场景中文名（必须与场景列表中一致）",
      "scene_variant": "default 或 night / storm 等变体名",
      "characters_in_frame": [
        {"name": "角色中文名", "state": null 或 "ghost"等状态名}
      ],
      "dialogue": [
        {"speaker": "角色中文名", "text": "台词中文", "emotion": "情绪"}
      ] 或 null,
      "narration": {"text": "旁白中文", "emotion": "情绪"} 或 null,
      "sfx": ["rain_heavy", "thunder"] 或 [],
      "transition_in": "cut",
      "transition_out": "cut",
      "continuity_strength": "medium"
    }
  ]
}`;
  }

  private buildUserPrompt(episode: any, characters: any[], scenes: any[]): string {
    const characterDescs = characters
      .map(
        (c) =>
          `- ${c.name}：${c.description}\n  视觉描述：${c.visualPrompt}${c.states ? `\n  状态变体：${JSON.stringify(c.states)}` : ''}`,
      )
      .join('\n');

    const sceneDescs = scenes
      .map(
        (s) =>
          `- ${s.name}：${s.description}\n  视觉描述：${s.visualPrompt}${s.variants ? `\n  氛围变体：${JSON.stringify(s.variants)}` : ''}`,
      )
      .join('\n');

    return `## 角色设定

${characterDescs}

## 场景设定

${sceneDescs}

## 本集信息

- 集数：第${episode.episodeNumber}集
- 标题：${episode.title}
- 情感曲线：${episode.emotionCurve || '未指定'}
- 结尾悬念：${episode.endingHook || '未指定'}

## 本集原文

${episode.originalText}

请生成本集的完整分镜指令。`;
  }
}
