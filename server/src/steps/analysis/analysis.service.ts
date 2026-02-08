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

// Phase 2 输出：分集规划
// 不再要求 LLM 复制完整原文，改为输出起止标记（原文前20字+后20字），由代码截取
interface EpisodePlanResult {
  episodes: {
    episode_number: number;
    title: string;
    summary: string;
    text_start_marker: string;
    text_end_marker: string;
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

    // ========== Phase 2：分集规划 ==========
    this.logger.log(`Project ${projectId} - Phase 2: 分集规划`);

    // 将已确定的角色/场景名称列表传入，确保分集时引用一致
    const characterNames = extractResult.characters.map((c) => c.name);
    const sceneNames = extractResult.scenes.map((s) => s.name);

    const { data: episodeResult } = await this.llm.chatJSON<EpisodePlanResult>(
      [
        { role: 'system', content: this.buildEpisodeSystemPrompt() },
        {
          role: 'user',
          content: this.buildEpisodeUserPrompt(novel.originalText, characterNames, sceneNames),
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 8000,
      },
    );

    // 存储分集，并回填角色/场景的 episodeIds
    const characterEpisodes = new Map<string, number[]>(); // characterId → episodeNumbers
    const sceneEpisodes = new Map<string, number[]>(); // sceneId → episodeNumbers

    for (const ep of episodeResult.episodes) {
      // 根据起止标记从原文中截取对应段落
      const originalText = this.extractOriginalText(
        novel.originalText,
        ep.text_start_marker,
        ep.text_end_marker,
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
      `Project ${projectId} - Phase 2 完成：${episodeResult.episodes.length}集`,
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

  // ==================== Phase 2 提示词：分集规划 ====================

  private buildEpisodeSystemPrompt(): string {
    return `你是一位专业的短剧编剧。你的任务是将一篇短篇小说拆分为多集短剧。

## 分集规划要求

- 每集适合制作2-3分钟的短剧视频
- 每集必须有独立的起承转合
- 每集结尾必须有悬念钩子，吸引观众看下一集
- 短剧第一集的开头必须在5秒内抓住观众注意力
- 保持原著的叙事风格和情感基调
- 每集对应的原文字数差异不超过30%，保持篇幅均衡

## 原文定位规则（重要）

- 不要复制原文内容到输出中
- 使用 text_start_marker 和 text_end_marker 标记每集对应的原文范围
- text_start_marker：该集原文**起始位置**的前20个字（从原文中精确复制）
- text_end_marker：该集原文**结束位置**的后20个字（从原文中精确复制）
- 每集的结束标记 = 下一集的起始标记（不要留空隙，也不要重叠）
- 第一集的 text_start_marker 必须是小说开头的前20个字
- 最后一集的 text_end_marker 必须是小说结尾的后20个字
- 标记文本必须与原文完全一致（包括标点符号），不要做任何修改

## 重要约束

- character_names 和 scene_names 必须严格使用提供的名称列表中的名称，不要自创或修改
- 确保每个角色和场景至少在一集中出现

## 输出格式

严格按照JSON格式输出，不要包含任何其他文字：

{
  "episodes": [
    {
      "episode_number": 1,
      "title": "集标题",
      "summary": "剧情摘要（中文，3-5句话）",
      "text_start_marker": "原文起始处的前20个字（精确复制）",
      "text_end_marker": "原文结束处的后20个字（精确复制）",
      "character_names": ["角色A", "角色B"],
      "scene_names": ["场景A", "场景B"],
      "emotion_curve": "平静 → 温馨 → 不安 → 震惊",
      "ending_hook": "悬念描述"
    }
  ]
}`;
  }

  private buildEpisodeUserPrompt(
    novelText: string,
    characterNames: string[],
    sceneNames: string[],
  ): string {
    return `## 已提取的角色列表
${characterNames.map((n) => `- ${n}`).join('\n')}

## 已提取的场景列表
${sceneNames.map((n) => `- ${n}`).join('\n')}

## 小说原文

${novelText}

请基于以上角色和场景，将小说拆分为多集短剧。character_names 和 scene_names 必须严格使用上方列表中的名称。
注意：不要复制原文，只需提供 text_start_marker 和 text_end_marker 标记每集的原文范围。`;
  }

  // ==================== 原文截取工具方法 ====================

  /**
   * 根据起止标记从原文中截取对应段落
   */
  private extractOriginalText(
    fullText: string,
    startMarker: string,
    endMarker: string,
  ): string {
    const startIdx = this.fuzzyIndexOf(fullText, startMarker);
    const endIdx = this.fuzzyIndexOf(fullText, endMarker);

    if (startIdx === -1 || endIdx === -1) {
      this.logger.warn(
        `原文标记匹配失败: start="${startMarker.slice(0, 10)}..." (${startIdx}), ` +
          `end="...${endMarker.slice(-10)}" (${endIdx})`,
      );
      return '';
    }

    const endPosition = endIdx + endMarker.length;
    return fullText.slice(startIdx, endPosition);
  }

  /**
   * 模糊查找：先尝试精确匹配，失败后去除空白和标点差异重试
   */
  private fuzzyIndexOf(text: string, marker: string): number {
    // 1. 精确匹配
    const exactIdx = text.indexOf(marker);
    if (exactIdx !== -1) return exactIdx;

    // 2. 去除多余空白后匹配
    const normalize = (s: string) => s.replace(/\s+/g, '');
    const normalizedText = normalize(text);
    const normalizedMarker = normalize(marker);
    const normalizedIdx = normalizedText.indexOf(normalizedMarker);

    if (normalizedIdx !== -1) {
      // 反向映射到原文位置：遍历原文，跳过空白字符计数
      let count = 0;
      for (let i = 0; i < text.length; i++) {
        if (!/\s/.test(text[i])) {
          if (count === normalizedIdx) return i;
          count++;
        }
      }
    }

    return -1;
  }
}
