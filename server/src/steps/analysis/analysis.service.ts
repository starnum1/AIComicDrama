import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';

// Phase 1 输出：角色 + 场景
interface ExtractResult {
  characters: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    states?: Record<string, string>;
  }[];
  scenes: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    variants?: Record<string, string>;
  }[];
}

// Phase 2 输出：分集规划（行号区间法）
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
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    // 1. 获取小说原文
    const novel = await this.prisma.novel.findUnique({
      where: { projectId },
    });

    if (!novel) {
      throw new Error('小说内容不存在');
    }

    this.logger.log(`Project ${projectId} - 开始全文分析，字数：${novel.charCount}`);

    // ========== Phase 1：提取角色 + 场景 ==========
    this.logger.log(`Project ${projectId} - Phase 1: 提取角色和场景`);

    const { data: extractResult } = await this.llm.chatJSON<ExtractResult>(
      [
        { role: 'system', content: this.buildExtractSystemPrompt() },
        {
          role: 'user',
          content: `请分析以下短篇小说，提取所有角色和场景：\n\n${novel.originalText}`,
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 8000,
      },
      aiConfigs?.llm,
    );

    // 存储角色
    const characterMap = new Map<string, string>(); // name → id
    for (let i = 0; i < extractResult.characters.length; i++) {
      const char = extractResult.characters[i];
      const created = await this.prisma.character.create({
        data: {
          projectId,
          name: char.name,
          description: char.description,
          visualPrompt: char.visual_prompt,
          visualNegative: char.visual_negative,
          states: char.states ?? Prisma.JsonNull,
          episodeIds: [], // 分集后回填
          sortOrder: i,
        },
      });
      characterMap.set(char.name, created.id);
    }

    // 存储场景
    const sceneMap = new Map<string, string>(); // name → id
    for (let i = 0; i < extractResult.scenes.length; i++) {
      const scene = extractResult.scenes[i];
      const created = await this.prisma.scene.create({
        data: {
          projectId,
          name: scene.name,
          description: scene.description,
          visualPrompt: scene.visual_prompt,
          visualNegative: scene.visual_negative,
          variants: scene.variants ?? Prisma.JsonNull,
          episodeIds: [], // 分集后回填
          sortOrder: i,
        },
      });
      sceneMap.set(scene.name, created.id);
    }

    this.logger.log(
      `Project ${projectId} - Phase 1 完成：${extractResult.characters.length}个角色，${extractResult.scenes.length}个场景`,
    );

    // ========== Phase 2：分集规划（行号区间法） ==========
    this.logger.log(`Project ${projectId} - Phase 2: 分集规划`);

    // 将原文按行拆分（前端上传时已清理空白行）
    const lines = novel.originalText.split('\n').filter((l) => l.trim().length > 0);
    const totalLines = lines.length;
    const totalChars = lines.reduce((sum, l) => sum + l.length, 0);

    this.logger.log(`Project ${projectId} - 原文共 ${totalLines} 行，${totalChars} 字`);

    // 构建带行号的文本供 LLM 分析
    const numberedText = lines.map((line, i) => `[${i + 1}] ${line}`).join('\n');

    // 将已确定的角色/场景名称列表传入，确保分集时引用一致
    const characterNames = extractResult.characters.map((c) => c.name);
    const sceneNames = extractResult.scenes.map((s) => s.name);

    const { data: episodeResult } = await this.llm.chatJSON<EpisodePlanResult>(
      [
        { role: 'system', content: this.buildEpisodeSystemPrompt(totalLines, totalChars) },
        {
          role: 'user',
          content: this.buildEpisodeUserPrompt(numberedText, characterNames, sceneNames),
        },
      ],
      {
        temperature: 0.5,
        maxTokens: 8000,
      },
      aiConfigs?.llm,
    );

    // 校验并修复行号区间
    const validatedEpisodes = this.validateEpisodeRanges(episodeResult.episodes, totalLines);

    // 存储分集，并回填角色/场景的 episodeIds
    const characterEpisodes = new Map<string, number[]>(); // characterId → episodeNumbers
    const sceneEpisodes = new Map<string, number[]>(); // sceneId → episodeNumbers

    for (const ep of validatedEpisodes) {
      // 根据行号区间截取原文（行号从 1 开始）
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

      // 收集每个角色/场景出现在哪些集
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
      `Project ${projectId} - Phase 2 完成：${validatedEpisodes.length}集`,
    );
  }

  // ==================== Phase 1 提示词：角色 + 场景提取 ====================

  private buildExtractSystemPrompt(): string {
    return `你是一位专业的3D动漫短剧策划师。你的任务是分析一篇短篇小说，提取所有角色和场景。

## 角色提取要求

- 识别所有有台词或重要戏份的角色
- 为每个角色生成完整的英文视觉描述（visual_prompt），用于AI图像生成
- 视觉描述必须包含：性别、年龄、体型、发型发色、面部特征、服装、整体风格
- 所有视觉描述统一使用以下基础风格前缀：3d anime style, cel-shading, cinematic lighting
- 小说中未明确描写的外貌，根据角色身份、性格、年代背景合理补充
- 如果角色在故事中有明显的状态变化（如生/死、变装、受伤），在states字段中为每种状态分别提供视觉描述
- visual_negative 用于排除不想要的风格元素，通常包含：realistic, photographic, western, modern（根据作品年代调整）

## 场景提取要求

- 识别所有出现的场景/地点
- 为每个场景生成完整的英文视觉描述（visual_prompt）
- 必须包含：场景类型（室内/室外）、空间布局、关键物件、光照条件、整体氛围
- 同样使用 3d anime style 前缀
- 如果同一场景在不同时段/天气下出现，在variants字段中提供变体描述
- 变体只改变光照和氛围，不改变空间布局和物件位置

## 输出格式

严格按照JSON格式输出，不要包含任何其他文字：

{
  "characters": [
    {
      "name": "角色中文名",
      "description": "角色简介（中文，2-3句话，包含性格和角色功能）",
      "visual_prompt": "3d anime style, cel-shading, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ... (英文负面提示词)",
      "states": {"状态名": "该状态下的完整英文视觉描述"} 或 null
    }
  ],
  "scenes": [
    {
      "name": "场景中文名",
      "description": "场景简介（中文）",
      "visual_prompt": "3d anime style, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ...",
      "variants": {"night": "夜晚变体描述", "storm": "暴风雨变体描述"} 或 null
    }
  ]
}`;
  }

  // ==================== Phase 2 提示词：分集规划（行号区间法） ====================

  private buildEpisodeSystemPrompt(totalLines: number, totalChars: number): string {
    // 按每集约 2000 字估算集数（2 分钟短剧大约对应 2000 字原文）
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

  /**
   * 校验分集行号区间的连续性和完整性，自动修复常见问题
   */
  private validateEpisodeRanges(
    episodes: EpisodePlanResult['episodes'],
    totalLines: number,
  ): EpisodePlanResult['episodes'] {
    if (episodes.length === 0) {
      throw new Error('LLM 返回了空的分集结果');
    }

    // 按 line_start 排序
    const sorted = [...episodes].sort((a, b) => a.line_start - b.line_start);

    // 修复第一集起始行
    if (sorted[0].line_start !== 1) {
      this.logger.warn(`分集校验：第一集 line_start=${sorted[0].line_start}，修正为 1`);
      sorted[0].line_start = 1;
    }

    // 修复最后一集结束行
    if (sorted[sorted.length - 1].line_end !== totalLines) {
      this.logger.warn(
        `分集校验：最后一集 line_end=${sorted[sorted.length - 1].line_end}，修正为 ${totalLines}`,
      );
      sorted[sorted.length - 1].line_end = totalLines;
    }

    // 修复相邻集之间的间隙/重叠
    for (let i = 1; i < sorted.length; i++) {
      const expectedStart = sorted[i - 1].line_end + 1;
      if (sorted[i].line_start !== expectedStart) {
        this.logger.warn(
          `分集校验：第${sorted[i].episode_number}集 line_start=${sorted[i].line_start}，修正为 ${expectedStart}`,
        );
        sorted[i].line_start = expectedStart;
      }
    }

    // 校验每集至少包含 1 行
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
