import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';

// 分集规划结果（行号区间法）
interface EpisodePlanResult {
  episodes: {
    episode_number: number;
    title: string;
    summary: string;
    line_start: number;
    line_end: number;
    character_names: string[];
    scene_names: string[];
    emotion_curve: string;
    ending_hook: string;
  }[];
}

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    // 获取小说原文
    const novel = await this.prisma.novel.findUnique({ where: { projectId } });
    if (!novel) throw new Error('小说内容不存在');

    // 获取已确认的角色和场景
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });

    if (characters.length === 0 || scenes.length === 0) {
      throw new Error('角色或场景数据为空，请先完成视觉资产步骤');
    }

    // 将原文按行拆分（前端上传时已清理空白行）
    const lines = novel.originalText.split('\n').filter((l) => l.trim().length > 0);
    const totalLines = lines.length;
    const totalChars = lines.reduce((sum, l) => sum + l.length, 0);

    this.logger.log(
      `Project ${projectId} - 开始分集规划，原文共 ${totalLines} 行，${totalChars} 字`,
    );

    this.ws.emitToProject(projectId, 'progress:detail', {
      step: 'episode',
      message: '正在分析剧情结构，规划分集...',
      completed: 0,
      total: 0,
    });

    // 构建带行号的文本
    const numberedText = lines.map((line, i) => `[${i + 1}] ${line}`).join('\n');

    const characterNames = characters.map((c) => c.name);
    const sceneNames = scenes.map((s) => s.name);

    // 构建角色/场景名称到 ID 的映射
    const characterMap = new Map(characters.map((c) => [c.name, c.id]));
    const sceneMap = new Map(scenes.map((s) => [s.name, s.id]));

    const { data: episodeResult } = await this.llm.chatJSON<EpisodePlanResult>(
      [
        { role: 'system', content: this.buildEpisodeSystemPrompt(totalLines, totalChars) },
        {
          role: 'user',
          content: this.buildEpisodeUserPrompt(numberedText, characterNames, sceneNames),
        },
      ],
      { temperature: 0.5, maxTokens: 8000 },
      aiConfigs?.llm,
    );

    // 校验并修复行号区间
    const validatedEpisodes = this.validateEpisodeRanges(episodeResult.episodes, totalLines);

    // 存储分集，并回填角色/场景的 episodeIds
    const characterEpisodes = new Map<string, number[]>();
    const sceneEpisodes = new Map<string, number[]>();

    for (const ep of validatedEpisodes) {
      const originalText = lines.slice(ep.line_start - 1, ep.line_end).join('\n');
      const epCharCount = originalText.length;

      this.logger.log(
        `Project ${projectId} - 第${ep.episode_number}集：行 ${ep.line_start}-${ep.line_end}，${epCharCount} 字`,
      );

      const characterIds = ep.character_names
        .map((name) => characterMap.get(name))
        .filter(Boolean) as string[];
      const sceneIds = ep.scene_names
        .map((name) => sceneMap.get(name))
        .filter(Boolean) as string[];

      await this.prisma.episode.create({
        data: {
          projectId,
          episodeNumber: ep.episode_number,
          title: ep.title,
          summary: ep.summary,
          originalText,
          characterIds,
          sceneIds,
          emotionCurve: ep.emotion_curve,
          endingHook: ep.ending_hook,
          sortOrder: ep.episode_number,
        },
      });

      for (const cId of characterIds) {
        const arr = characterEpisodes.get(cId) || [];
        arr.push(ep.episode_number);
        characterEpisodes.set(cId, arr);
      }
      for (const sId of sceneIds) {
        const arr = sceneEpisodes.get(sId) || [];
        arr.push(ep.episode_number);
        sceneEpisodes.set(sId, arr);
      }
    }

    // 回填角色和场景的 episodeIds
    for (const [characterId, epNums] of characterEpisodes) {
      await this.prisma.character.update({
        where: { id: characterId },
        data: { episodeIds: epNums },
      });
    }
    for (const [sceneId, epNums] of sceneEpisodes) {
      await this.prisma.scene.update({
        where: { id: sceneId },
        data: { episodeIds: epNums },
      });
    }

    this.logger.log(
      `Project ${projectId} - 分集规划完成：${validatedEpisodes.length} 集`,
    );
  }

  // ==================== 提示词 ====================

  private buildEpisodeSystemPrompt(totalLines: number, totalChars: number): string {
    const estimatedEpisodes = Math.max(2, Math.ceil(totalChars / 2000));

    return `你是一位专业的短剧编剧和分集策划师。你的任务是将一篇带行号标记的短篇小说拆分为多集短剧。

## 小说基本信息

- 总行数：${totalLines} 行
- 总字数：约 ${totalChars} 字
- 建议分集数量：${estimatedEpisodes} 集左右（可根据剧情需要微调 ±1 集）

## 分集核心原则

1. **节奏把控**：每集对应约 2 分钟短剧视频（约 1500-2500 字原文），各集字数应大致均衡，偏差不超过 30%
2. **独立完整**：每集必须有清晰的开端、发展、高潮/转折
3. **钩子设计**：每集结尾必须留悬念或情感钩子，让观众想看下一集
4. **第一集开场**：第一集的前 3 行内容必须能在 5 秒内抓住观众（冲突/悬念/强情绪）
5. **自然断点**：在场景转换、时间跳跃、情节转折处断集，不要在一句话中间断开

## 行号区间规则（必须严格遵守）

- 原文每行开头有 [行号] 标记，如 [1]、[2]、[3]...
- 每集用 line_start 和 line_end 表示该集对应的行号范围（闭区间）
- **第一集的 line_start 必须是 1**
- **最后一集的 line_end 必须是 ${totalLines}**
- **相邻集必须紧密衔接**：上一集的 line_end + 1 = 下一集的 line_start
- **不允许遗漏或重叠**：所有行必须且仅被分配到一集中

## 重要约束

- character_names 和 scene_names 必须严格使用提供的名称列表中的名称，不要自创或修改
- 确保每个角色和场景至少在一集中出现

## 输出格式

严格按照 JSON 格式输出，不要包含任何其他文字：

{
  "episodes": [
    {
      "episode_number": 1,
      "title": "集标题（简短有吸引力）",
      "summary": "剧情摘要（中文，3-5 句话，概括本集核心事件和情感走向）",
      "line_start": 1,
      "line_end": 25,
      "character_names": ["角色A", "角色B"],
      "scene_names": ["场景A"],
      "emotion_curve": "平静 → 温馨 → 不安 → 震惊",
      "ending_hook": "本集结尾悬念描述（1 句话）"
    }
  ]
}`;
  }

  private buildEpisodeUserPrompt(
    numberedText: string,
    characterNames: string[],
    sceneNames: string[],
  ): string {
    return `## 已提取的角色列表
${characterNames.map((n) => `- ${n}`).join('\n')}

## 已提取的场景列表
${sceneNames.map((n) => `- ${n}`).join('\n')}

## 小说原文（带行号）

${numberedText}

请基于以上内容将小说拆分为多集短剧。
要求：
1. character_names 和 scene_names 必须严格使用上方列表中的名称
2. 每集用 line_start / line_end 标注行号范围
3. 确保行号连续、无遗漏、无重叠`;
  }

  // ==================== 行号区间校验与修复 ====================

  private validateEpisodeRanges(
    episodes: EpisodePlanResult['episodes'],
    totalLines: number,
  ): EpisodePlanResult['episodes'] {
    if (episodes.length === 0) {
      throw new Error('LLM 返回了空的分集结果');
    }

    const sorted = [...episodes].sort((a, b) => a.line_start - b.line_start);

    if (sorted[0].line_start !== 1) {
      this.logger.warn(`分集校验：第一集 line_start=${sorted[0].line_start}，修正为 1`);
      sorted[0].line_start = 1;
    }

    if (sorted[sorted.length - 1].line_end !== totalLines) {
      this.logger.warn(
        `分集校验：最后一集 line_end=${sorted[sorted.length - 1].line_end}，修正为 ${totalLines}`,
      );
      sorted[sorted.length - 1].line_end = totalLines;
    }

    for (let i = 1; i < sorted.length; i++) {
      const expectedStart = sorted[i - 1].line_end + 1;
      if (sorted[i].line_start !== expectedStart) {
        this.logger.warn(
          `分集校验：第${sorted[i].episode_number}集 line_start=${sorted[i].line_start}，修正为 ${expectedStart}`,
        );
        sorted[i].line_start = expectedStart;
      }
    }

    for (const ep of sorted) {
      if (ep.line_end < ep.line_start) {
        this.logger.warn(
          `分集校验：第${ep.episode_number}集范围无效 [${ep.line_start}, ${ep.line_end}]`,
        );
      }
    }

    return sorted;
  }
}
