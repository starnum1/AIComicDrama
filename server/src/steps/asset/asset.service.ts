import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { executeBatch } from '../../common/concurrency';
import type { ProjectAiConfigs } from '../../pipeline/pipeline.processor';
import type { AiProviderConfig } from '../../ai-providers/ai-providers.service';

// LLM 提取结果：角色 + 场景
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

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  // ==================== 流水线步骤：只做 LLM 提取 ====================

  async execute(projectId: string, aiConfigs?: ProjectAiConfigs): Promise<void> {
    const novel = await this.prisma.novel.findUnique({ where: { projectId } });
    if (!novel) throw new Error('小说内容不存在');

    this.logger.log(`Project ${projectId} - 开始视觉资产构建，字数：${novel.charCount}`);

    this.ws.emitToProject(projectId, 'progress:detail', {
      step: 'asset',
      message: '正在分析角色和场景...',
      completed: 0,
      total: 0,
    });

    const { data: extractResult } = await this.llm.chatJSON<ExtractResult>(
      [
        { role: 'system', content: this.buildExtractSystemPrompt() },
        {
          role: 'user',
          content: `请分析以下短篇小说，提取所有角色和场景：\n\n${novel.originalText}`,
        },
      ],
      { temperature: 0.7, maxTokens: 16000 },
      aiConfigs?.llm,
    );

    // 存储角色
    for (let i = 0; i < extractResult.characters.length; i++) {
      const char = extractResult.characters[i];
      await this.prisma.character.create({
        data: {
          projectId,
          name: char.name,
          description: char.description,
          visualPrompt: char.visual_prompt,
          visualNegative: char.visual_negative,
          states: char.states ?? Prisma.JsonNull,
          episodeIds: [],
          sortOrder: i,
        },
      });
    }

    // 存储场景
    for (let i = 0; i < extractResult.scenes.length; i++) {
      const scene = extractResult.scenes[i];
      await this.prisma.scene.create({
        data: {
          projectId,
          name: scene.name,
          description: scene.description,
          visualPrompt: scene.visual_prompt,
          visualNegative: scene.visual_negative,
          variants: scene.variants ?? Prisma.JsonNull,
          episodeIds: [],
          sortOrder: i,
        },
      });
    }

    this.logger.log(
      `Project ${projectId} - 提取完成：${extractResult.characters.length}个角色，${extractResult.scenes.length}个场景，等待用户审核和手动生图`,
    );

    // 注意：不再自动生成图片，由用户在审核页面手动触发
  }

  // ==================== 角色定妆照生成（三视图：正面+3/4+背面） ====================

  /**
   * 为单个角色生成定妆照（一张图包含正面、3/4侧面、背面三视图）
   */
  async generateCharacterTurnaround(
    characterId: string,
    imageConfig?: AiProviderConfig,
  ): Promise<{ id: string; imageUrl: string }> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) throw new Error(`Character ${characterId} not found`);

    const prompt = this.buildTurnaroundPrompt(character.visualPrompt);

    this.logger.log(`Generating turnaround for character: ${character.name}`);

    const result = await this.imageGen.generate(
      {
        prompt,
        negativePrompt: `${character.visualNegative}, single view, single pose, cropped, partial body, multiple characters, crowd`,
        width: 1920,
        height: 1080,
      },
      imageConfig,
    );

    const storagePath = this.storage.generatePath(
      character.projectId,
      'character-sheets',
      'png',
    );
    const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);

    const sheet = await this.prisma.characterSheet.create({
      data: {
        characterId: character.id,
        imageUrl: localUrl,
        stateName: null,
        gridSpec: 'turnaround',
      },
    });

    this.ws.emitToProject(character.projectId, 'asset:character:sheet', {
      characterId: character.id,
      sheetUrl: localUrl,
    });

    return { id: sheet.id, imageUrl: localUrl };
  }

  // ==================== 场景锚图生成 ====================

  /**
   * 为单个场景生成锚图（指定变体，默认为 default）
   */
  async generateSceneAnchor(
    sceneId: string,
    variant: string = 'default',
    imageConfig?: AiProviderConfig,
  ): Promise<{ id: string; imageUrl: string }> {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
    });
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    let prompt: string;
    if (variant === 'default') {
      prompt = `${scene.visualPrompt}, wide shot, establishing shot, full environment view, 16:9 aspect ratio, high quality, detailed background`;
    } else {
      const variants = scene.variants as Record<string, string> | null;
      const variantDesc = variants?.[variant] || '';
      prompt = `${scene.visualPrompt}, ${variantDesc}, wide shot, establishing shot, 16:9, high quality`;
    }

    this.logger.log(`Generating scene anchor: ${scene.name} (variant: ${variant})`);

    const result = await this.imageGen.generate(
      {
        prompt,
        negativePrompt: scene.visualNegative,
        width: 1920,
        height: 1080,
      },
      imageConfig,
    );

    const storagePath = this.storage.generatePath(scene.projectId, 'scenes', 'png');
    const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);

    // 如果已有同变体的图，先删除
    await this.prisma.sceneImage.deleteMany({
      where: { sceneId: scene.id, variant },
    });

    const sceneImage = await this.prisma.sceneImage.create({
      data: { sceneId: scene.id, variant, imageUrl: localUrl },
    });

    this.ws.emitToProject(scene.projectId, 'asset:scene:complete', {
      sceneId: scene.id,
      variant,
      imageUrl: localUrl,
    });

    return { id: sceneImage.id, imageUrl: localUrl };
  }

  // ==================== 批量生成（一键全部） ====================

  /**
   * 为项目批量生成所有缺失的资产
   */
  async generateAllMissing(
    projectId: string,
    imageConfig?: AiProviderConfig,
  ): Promise<{ generated: number }> {
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      include: { sheets: true },
    });
    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      include: { images: true },
    });

    const taskFactories: Array<() => Promise<void>> = [];
    let totalTasks = 0;
    let completedTasks = 0;

    // 缺少定妆照的角色
    for (const char of characters) {
      if (char.sheets.length === 0) {
        totalTasks++;
        taskFactories.push(async () => {
          await this.generateCharacterTurnaround(char.id, imageConfig);
          completedTasks++;
          this.ws.emitToProject(projectId, 'progress:detail', {
            step: 'asset',
            message: `生成中 ${completedTasks}/${totalTasks}（角色：${char.name}）`,
            completed: completedTasks,
            total: totalTasks,
          });
        });
      }
    }

    // 缺少默认锚图的场景
    for (const scene of scenes) {
      const hasDefault = scene.images.some((img) => img.variant === 'default');
      if (!hasDefault) {
        totalTasks++;
        taskFactories.push(async () => {
          await this.generateSceneAnchor(scene.id, 'default', imageConfig);
          completedTasks++;
          this.ws.emitToProject(projectId, 'progress:detail', {
            step: 'asset',
            message: `生成中 ${completedTasks}/${totalTasks}（场景：${scene.name}）`,
            completed: completedTasks,
            total: totalTasks,
          });
        });
      }
    }

    if (taskFactories.length === 0) {
      return { generated: 0 };
    }

    await executeBatch(taskFactories, 3);

    return { generated: totalTasks };
  }

  // ==================== 提示词 ====================

  private buildExtractSystemPrompt(): string {
    return `你是一位专业的3D动漫短剧视觉设计师。你的任务是分析一篇短篇小说，提取所有角色和场景，并为每个角色和场景撰写**极其详细**的视觉描述。

⚠️ 最重要的原则：生成图片的 AI **完全看不到原文小说**，它只能依赖你写的 description 和 visual_prompt 来画图。所以你的描述必须**自成一体、极其详尽**，不能省略任何视觉信息。描述不详细 = 图片画错 = 项目失败。

## 角色提取要求

### 提取范围
- 识别所有有台词或重要戏份的角色（仅限生物角色：人类、动物、妖怪等）
- 小说中未明确描写的外貌特征，你必须根据角色身份、性格、年代背景、地域文化**合理想象补充**，不能留空

### description 字段（中文视觉档案，至少 5-8 句话）
必须包含以下全部信息，缺一不可：
1. **性别、年龄段、身高体型**（如"16岁少女，身材瘦小约155cm，体重偏轻"）
2. **肤色与肤质**（如"偏黄的日晒肤色，脸颊有几颗淡雀斑"）
3. **面部五官**（眼型、眼色、眉形、鼻型、唇型、脸型，逐一描写）
4. **发型与发色**（长度、颜色、直/卷、扎法、碎发等细节）
5. **服装完整描述**（上衣款式和颜色、下装、鞋子，每件都要具体描写材质和状态）
6. **配饰与特征标记**（首饰、帽子、围巾、伤疤、胎记、纹身等，没有则注明"无明显配饰"）
7. **整体气质与习惯姿态**（如"常微微驼背低头，眼神警觉但不敢直视人"）

### visual_prompt 字段（英文图片生成 prompt，至少 80 个英文单词）
结构必须按以下顺序，每部分用逗号分隔：
1. 风格前缀：3d anime style, cel-shading, cinematic lighting
2. 角色基本：性别 + 年龄 + 体型 + 身高（如 teenage girl, 16 years old, slim petite build, around 155cm tall）
3. 面部详细：脸型 + 眼睛 + 眉毛 + 鼻子 + 嘴唇 + 肤色（逐一用英文描写）
4. 发型详细：颜色 + 长度 + 质地 + 扎法（如 long straight black hair tied in a low ponytail with a coarse cloth band, loose strands on forehead）
5. 服装详细：上衣 + 下装 + 鞋子 + 配饰（每件单独描写，如 faded gray coarse cotton blouse with sleeves rolled up to forearms, dark blue patched long trousers, straw woven sandals）
6. 气质/表情：（如 timid but alert expression, slightly hunched posture）

### visual_negative 字段
排除不想要的风格元素，通常包含：realistic, photographic, western, modern clothing, deformed, bad anatomy, extra limbs

### states 字段
如果角色在故事中有明显的状态变化（如生→死、人→鬼、正常→受伤），为每种状态**完整重写**一份 visual_prompt（不能只写差异部分，必须是完整的独立描述）

## 场景提取要求

### description 字段（中文场景视觉档案，至少 5-8 句话）
必须包含：
1. **空间类型与尺度**（室内/室外、大小、高度）
2. **建筑/地形材质**（如"土坯墙面已开裂，地面是夯实的黄土地"）
3. **关键物件及位置**（如"墙角有一口大铁锅架在土灶上，灶台左侧放着几只缺口的粗陶碗"）
4. **光照条件**（光源方向、光线强弱、光色，如"唯一的光源是灶台上方悬挂的一盏煤油灯，橘黄色微弱灯光"）
5. **色调与氛围**（如"整体色调昏暗偏黄，压抑阴冷"）
6. **环境细节**（气味暗示的视觉线索、墙上的物件、窗户状态等）

### visual_prompt 字段（英文，至少 80 个英文单词）
结构必须包含：
1. 风格前缀：3d anime style, cel-shading, cinematic lighting
2. 场景类型：interior/exterior, 空间描述
3. 建筑/地形材质细节
4. 关键物件及空间关系
5. 光照：光源位置、光线颜色和强度、阴影方向
6. 色调与氛围
7. 画面构图建议（如 wide angle, low camera angle, centered composition）

### variants 字段
如果同一场景在不同时段/天气下出现，在 variants 中为每个变体**完整重写** visual_prompt（不能只写差异，必须独立完整）

## 输出格式

严格按照JSON格式输出，不要包含任何其他文字：

{
  "characters": [
    {
      "name": "角色中文名",
      "description": "（中文详细视觉档案，至少5-8句话，涵盖上述所有维度）",
      "visual_prompt": "3d anime style, cel-shading, cinematic lighting, ... （至少80个英文单词的完整视觉描述）",
      "visual_negative": "realistic, photographic, ...",
      "states": {"状态名": "（该状态下完整独立的英文视觉描述，至少80个英文单词）"} 或 null
    }
  ],
  "scenes": [
    {
      "name": "场景中文名",
      "description": "（中文详细视觉档案，至少5-8句话，涵盖上述所有维度）",
      "visual_prompt": "3d anime style, cel-shading, cinematic lighting, ... （至少80个英文单词的完整视觉描述）",
      "visual_negative": "realistic, photographic, ...",
      "variants": {"变体名": "（完整独立的英文视觉描述，至少80个英文单词）"} 或 null
    }
  ]
}`;
  }

  /**
   * 构建角色定妆照 prompt（三视图：正面、3/4 侧面、背面）
   */
  private buildTurnaroundPrompt(visualPrompt: string): string {
    return [
      visualPrompt,
      'character turnaround reference sheet',
      'three views side by side on clean white background',
      'left: front full body view',
      'center: three-quarter angle full body view',
      'right: back full body view',
      'same character same outfit in all views',
      'standing pose',
      'consistent character design',
      'clean white background',
      'high quality, detailed, professional character design sheet',
    ].join(', ');
  }
}
