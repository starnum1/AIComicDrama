# AI漫剧工坊 - 完整开发指南

> 从短篇小说到AI短剧的全流程技术方案与实现细节

---

## 一、项目概述

### 1.1 产品定位

将 8,000-30,000 字的短篇小说，通过 AI 自动转化为多集 3D 动漫风格短剧视频的 Web 平台。

### 1.2 核心流程

```
用户上传小说 → 全文分析+分集 → 视觉资产生成 → 分镜生成 → 视觉锚点生成 → 视频生成 → 组装输出
```

### 1.3 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Vue 3 + TypeScript + Vite | 单页应用，不兼容移动端 |
| UI框架 | Element Plus | 成熟稳定，组件丰富 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 后端 | NestJS + TypeScript | 模块化架构，流水线模式 |
| ORM | Prisma | TypeScript 最友好的 ORM |
| 任务队列 | BullMQ + Redis | 异步AI任务管理 |
| 实时通信 | 原生 WebSocket (ws) | 生成进度推送 |
| 数据库 | PostgreSQL | 结构化业务数据 |
| 文件存储 | MinIO（开发）/ 阿里云OSS（生产） | 图片、视频文件存储 |
| 容器化 | Docker + Docker Compose | 本地开发环境 |

### 1.4 外部AI服务

| 能力 | 用途 | 接入方式 |
|---|---|---|
| LLM（大语言模型） | 全文分析、分集、分镜生成 | 中转站API（OpenAI兼容格式） |
| 图片生成 | 角色定妆照、场景锚图、首帧/尾帧 | 中转站API |
| 视频生成 | 镜头视频片段（音画同出，4-12秒） | 豆包API |
| ~~TTS配音~~ | ~~暂不实现，后续扩展~~ | - |

---

## 二、项目搭建

### 2.1 目录结构

```
AIComicDrama/
├── pnpm-workspace.yaml         # pnpm monorepo 工作区配置
├── package.json                # 根 package.json（workspace scripts）
├── docker-compose.yml          # Docker编排（PostgreSQL + Redis + MinIO）
├── .env                        # 环境变量
├── .env.example                # 环境变量示例
│
├── packages/
│   └── shared/                 # 前后端共享包
│       ├── package.json        # name: @aicomic/shared
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts        # 统一导出
│           ├── types/          # 共享类型定义
│           │   ├── project.ts      # 项目相关类型
│           │   ├── episode.ts      # 分集相关类型
│           │   ├── character.ts    # 角色相关类型
│           │   ├── scene.ts        # 场景相关类型
│           │   ├── shot.ts         # 分镜相关类型
│           │   ├── pipeline.ts     # 流水线相关类型
│           │   └── ws-events.ts    # WebSocket事件类型
│           ├── constants/      # 共享常量
│           │   ├── pipeline.ts     # 流水线步骤定义
│           │   ├── shot.ts         # 镜头类型、运镜方式等枚举
│           │   └── limits.ts       # 业务限制（字数范围、时长范围等）
│           └── enums/          # 共享枚举
│               ├── project-status.ts
│               ├── task-status.ts
│               └── shot-type.ts
│
├── server/                     # NestJS 后端
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── prisma/
│   │   └── schema.prisma       # 数据库模型
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/             # 配置模块
│       ├── common/             # 公共工具（守卫、拦截器、过滤器、WsGateway）
│       ├── modules/            # 基础业务模块
│       │   ├── auth/           # 认证
│       │   ├── user/           # 用户
│       │   ├── project/        # 项目管理
│       │   └── billing/        # 计费
│       ├── pipeline/           # 流水线编排器
│       ├── steps/              # 流水线步骤模块
│       │   ├── analysis/       # Step1 全文分析+分集
│       │   ├── asset/          # Step2 视觉资产生成
│       │   ├── storyboard/     # Step3 分镜生成
│       │   ├── anchor/         # Step4 视觉锚点生成
│       │   ├── video/          # Step5 视频生成
│       │   └── assembly/       # Step6 组装输出
│       └── providers/          # AI供应商适配层
│           ├── llm/            # LLM适配
│           ├── image-gen/      # 图片生成适配
│           └── video-gen/      # 视频生成适配
│
├── web/                        # Vue 3 前端
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── router/
│       ├── stores/             # Pinia
│       ├── api/                # 后端接口封装
│       ├── composables/
│       │   └── useWebSocket.ts # WebSocket 连接（原生）
│       ├── views/
│       │   ├── auth/           # 登录/注册
│       │   ├── dashboard/      # 项目列表
│       │   ├── project/        # 项目详情（主工作区）
│       │   └── billing/        # 充值/消费
│       ├── components/         # 公共组件
│       └── styles/
│
└── docs/                       # 文档
```

### 2.2 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: aicomic-postgres
    environment:
      POSTGRES_USER: aicomic
      POSTGRES_PASSWORD: aicomic123
      POSTGRES_DB: aicomic
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: aicomic-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    container_name: aicomic-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"    # API
      - "9001:9001"    # 控制台
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 2.3 环境变量

```bash
# .env.example

# 数据库
DATABASE_URL="postgresql://aicomic:aicomic123@localhost:5432/aicomic"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=aicomic

# AI服务 - LLM（中转站）
LLM_BASE_URL=https://your-relay-api.com/v1
LLM_API_KEY=sk-xxxx
LLM_MODEL=gpt-4o

# AI服务 - 图片生成（中转站）
IMAGE_GEN_BASE_URL=https://your-relay-api.com/v1
IMAGE_GEN_API_KEY=sk-xxxx
IMAGE_GEN_MODEL=dall-e-3

# AI服务 - 视频生成（豆包）
VIDEO_GEN_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VIDEO_GEN_API_KEY=your-doubao-key
VIDEO_GEN_MODEL=doubao-video-gen

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

### 2.4 Monorepo 工作区配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'server'
  - 'web'
```

```json
// 根 package.json
{
  "name": "aicomic-drama",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server run start:dev",
    "dev:web": "pnpm --filter web run dev",
    "dev": "pnpm run dev:server & pnpm run dev:web",
    "build:shared": "pnpm --filter @aicomic/shared run build",
    "db:migrate": "pnpm --filter server exec prisma migrate dev",
    "db:generate": "pnpm --filter server exec prisma generate"
  }
}
```

### 2.5 共享包结构

```json
// packages/shared/package.json
{
  "name": "@aicomic/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

共享包的核心内容（详见第四节"共享类型定义"）：

```typescript
// packages/shared/src/index.ts — 统一导出
export * from './types';
export * from './constants';
export * from './enums';
```

### 2.6 初始化命令

```bash
# 0. 全局安装 pnpm（如果没有）
npm install -g pnpm

# 1. 启动基础设施
docker-compose up -d

# 2. 初始化根工作区
pnpm init
# 手动创建 pnpm-workspace.yaml（内容见上方）

# 3. 创建共享包
mkdir -p packages/shared/src/{types,constants,enums}
cd packages/shared && pnpm init
# 修改 package.json 的 name 为 @aicomic/shared

# 4. 创建后端项目
cd ../../server
pnpm init
pnpm add @nestjs/cli -g
nest new . --skip-git --package-manager pnpm

# 5. 安装后端依赖
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs/websockets @nestjs/platform-ws ws
pnpm add @nestjs/bullmq bullmq ioredis
pnpm add prisma @prisma/client
pnpm add minio
pnpm add class-validator class-transformer
pnpm add bcryptjs uuid
pnpm add -D @types/bcryptjs @types/passport-jwt @types/ws
pnpm add @aicomic/shared --workspace

# 6. 初始化Prisma
pnpm exec prisma init

# 7. 创建前端项目
cd ../web
pnpm create vue@latest . -- --typescript --vue-router --pinia

# 8. 安装前端依赖
pnpm add element-plus @element-plus/icons-vue
pnpm add axios
pnpm add @aicomic/shared --workspace
```

---

## 三、数据库设计

### 3.1 Prisma Schema

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 用户系统 ====================

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  nickname      String?
  balance       Decimal   @default(0) @db.Decimal(10, 2)  // 账户余额（元）
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      Project[]
  billingRecords BillingRecord[]
}

model BillingRecord {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  type          String    // recharge=充值, consume=消费
  amount        Decimal   @db.Decimal(10, 4)
  description   String?
  relatedTaskId String?   // 关联的任务ID
  createdAt     DateTime  @default(now())
}

// ==================== 项目 ====================

model Project {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String
  status        String    @default("created")
  // created → analyzing → assets_generating → storyboarding →
  // anchoring → video_generating → assembling → completed → failed
  currentStep   String    @default("created")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  novel         Novel?
  characters    Character[]
  scenes        Scene[]
  episodes      Episode[]
  tasks         Task[]
}

// ==================== Step0: 小说 ====================

model Novel {
  id            String    @id @default(uuid())
  projectId     String    @unique
  project       Project   @relation(fields: [projectId], references: [id])
  originalText  String    // 原始小说全文
  charCount     Int       // 字数
  createdAt     DateTime  @default(now())
}

// ==================== Step1: 分析结果 ====================

model Character {
  id              String    @id @default(uuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])
  name            String    // 角色名称（中文）
  description     String    // 角色描述（中文）
  visualPrompt    String    // 英文视觉描述（用于图片生成prompt）
  visualNegative  String    // 负面提示词
  voiceDesc       String?   // 声音描述（预留）
  states          Json?     // 状态变体 {"alive": "...", "ghost": "..."}
  episodeIds      Json      // 出现的集数 [1, 2, 3]
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  images          CharacterImage[]
  shots           ShotCharacter[]
}

model Scene {
  id              String    @id @default(uuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])
  name            String    // 场景名称（中文）
  description     String    // 场景描述（中文）
  visualPrompt    String    // 英文视觉描述
  visualNegative  String    // 负面提示词
  variants        Json?     // 氛围变体 {"day": "...", "night": "...", "storm": "..."}
  episodeIds      Json      // 出现的集数
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  images          SceneImage[]
  shots           Shot[]
}

// ==================== Step1: 分集 ====================

model Episode {
  id              String    @id @default(uuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])
  episodeNumber   Int       // 第几集
  title           String    // 集标题
  summary         String    // 剧情摘要
  originalText    String    // 对应的原文段落
  characterIds    Json      // 涉及的角色ID列表
  sceneIds        Json      // 涉及的场景ID列表
  emotionCurve    String?   // 情感曲线描述
  endingHook      String?   // 结尾悬念
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  shots           Shot[]
  finalVideo      FinalVideo?
}

// ==================== Step2: 视觉资产 ====================

model CharacterImage {
  id              String    @id @default(uuid())
  characterId     String
  character       Character @relation(fields: [characterId], references: [id])
  imageType       String    // front=正面, side=侧面, expression_happy=喜, expression_sad=哀...
  imageUrl        String    // MinIO/OSS文件路径
  stateName       String?   // 对应的状态名（如"ghost"），null表示默认状态
  createdAt       DateTime  @default(now())
}

model SceneImage {
  id              String    @id @default(uuid())
  sceneId         String
  scene           Scene     @relation(fields: [sceneId], references: [id])
  variant         String    @default("default") // default/day/night/storm...
  imageUrl        String
  createdAt       DateTime  @default(now())
}

// ==================== Step3: 分镜 ====================

model Shot {
  id                String    @id @default(uuid())
  episodeId         String
  episode           Episode   @relation(fields: [episodeId], references: [id])
  sceneId           String
  scene             Scene     @relation(fields: [sceneId], references: [id])
  shotNumber        Int       // 镜头序号
  duration          Int       // 时长（秒，4-12）
  shotType          String    // wide/medium/close_up/extreme_close_up
  cameraMovement    String    // static/push_in/pull_out/pan_left/pan_right/tilt_up/tilt_down
  imagePrompt       String    // 完整英文画面描述
  imageNegative     String    // 负面提示词
  videoMotion       String    // 视频运动描述（英文）
  sceneVariant      String    @default("default") // 使用场景的哪个氛围变体
  dialogue          Json?     // 对话 [{speaker, text, emotion}]
  narration         Json?     // 旁白 {text, emotion}
  sfx               Json?     // 音效标签 ["rain", "thunder"]
  transitionIn      String    @default("cut")
  transitionOut     String    @default("cut")
  continuityStrength String   @default("medium") // strong/medium/weak
  sortOrder         Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  characters        ShotCharacter[]
  images            ShotImage[]
  video             ShotVideo?
}

// 镜头-角色关联表
model ShotCharacter {
  id              String    @id @default(uuid())
  shotId          String
  shot            Shot      @relation(fields: [shotId], references: [id])
  characterId     String
  character       Character @relation(fields: [characterId], references: [id])
  characterState  String?   // 角色在此镜头的状态（如"ghost"）

  @@unique([shotId, characterId])
}

// ==================== Step4: 视觉锚点 ====================

model ShotImage {
  id              String    @id @default(uuid())
  shotId          String
  shot            Shot      @relation(fields: [shotId], references: [id])
  imageType       String    // first_frame/last_frame/key_frame
  imageUrl        String
  createdAt       DateTime  @default(now())
}

// ==================== Step5: 视频 ====================

model ShotVideo {
  id              String    @id @default(uuid())
  shotId          String    @unique
  shot            Shot      @relation(fields: [shotId], references: [id])
  videoUrl        String
  actualDuration  Float?    // 实际生成时长
  createdAt       DateTime  @default(now())
}

// ==================== Step6: 成片 ====================

model FinalVideo {
  id              String    @id @default(uuid())
  episodeId       String    @unique
  episode         Episode   @relation(fields: [episodeId], references: [id])
  videoUrl        String
  duration        Float?
  createdAt       DateTime  @default(now())
}

// ==================== 任务管理 ====================

model Task {
  id              String    @id @default(uuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])
  step            String    // analysis/asset/storyboard/anchor/video/assembly
  entityType      String?   // character/scene/episode/shot 等
  entityId        String?   // 关联的实体ID
  status          String    @default("pending")
  // pending → running → success / failed / retrying
  retryCount      Int       @default(0)
  maxRetries      Int       @default(3)
  errorMessage    String?
  cost            Decimal?  @db.Decimal(10, 4) // 本次任务花费
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([projectId, step])
  @@index([status])
}
```

### 3.2 初始化数据库

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

---

## 四、共享类型定义（@aicomic/shared）

前后端共用的类型、常量、枚举全部放在 `packages/shared` 中。后端和前端通过 `import { ... } from '@aicomic/shared'` 引用，确保接口定义一致。

### 4.0.1 枚举定义

```typescript
// packages/shared/src/enums/project-status.ts

export enum ProjectStatus {
  Created = 'created',
  Analyzing = 'analyzing',
  AssetsGenerating = 'assets_generating',
  AssetReview = 'asset_review',
  Storyboarding = 'storyboarding',
  Anchoring = 'anchoring',
  VideoGenerating = 'video_generating',
  Assembling = 'assembling',
  Completed = 'completed',
  Failed = 'failed',
}

export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Retrying = 'retrying',
}

// packages/shared/src/enums/shot-type.ts

export enum ShotType {
  Wide = 'wide',
  Medium = 'medium',
  CloseUp = 'close_up',
  ExtremeCloseUp = 'extreme_close_up',
  OverShoulder = 'over_shoulder',
  LowAngle = 'low_angle',
  HighAngle = 'high_angle',
  POV = 'pov',
}

export enum CameraMovement {
  Static = 'static',
  PushIn = 'push_in',
  PullOut = 'pull_out',
  PanLeft = 'pan_left',
  PanRight = 'pan_right',
  TiltUp = 'tilt_up',
  TiltDown = 'tilt_down',
  Follow = 'follow',
  Handheld = 'handheld',
}

export enum TransitionType {
  Cut = 'cut',
  Dissolve = 'dissolve',
  FadeIn = 'fade_in',
  FadeOut = 'fade_out',
  SmashCut = 'smash_cut',
}

export enum ContinuityStrength {
  Strong = 'strong',
  Medium = 'medium',
  Weak = 'weak',
}
```

### 4.0.2 常量定义

```typescript
// packages/shared/src/constants/limits.ts

/** 小说字数限制 */
export const NOVEL_MIN_CHARS = 8000;
export const NOVEL_MAX_CHARS = 30000;

/** 每集时长限制（分钟） */
export const EPISODE_MIN_DURATION = 2;
export const EPISODE_MAX_DURATION = 3;

/** 镜头时长限制（秒）— 适配豆包API */
export const SHOT_MIN_DURATION = 4;
export const SHOT_MAX_DURATION = 12;

/** 单集镜头数量建议范围 */
export const SHOTS_PER_EPISODE_MIN = 10;
export const SHOTS_PER_EPISODE_MAX = 25;

// packages/shared/src/constants/pipeline.ts

import type { PipelineStep } from '../types/pipeline';

/** 流水线步骤顺序 */
export const PIPELINE_STEP_ORDER: PipelineStep[] = [
  'analysis',
  'asset',
  'storyboard',
  'anchor',
  'video',
  'assembly',
];

/** 需要用户确认的步骤 */
export const PIPELINE_REVIEW_STEPS: PipelineStep[] = ['asset'];
```

### 4.0.3 类型定义

```typescript
// packages/shared/src/types/pipeline.ts

export type PipelineStep =
  | 'analysis'
  | 'asset'
  | 'storyboard'
  | 'anchor'
  | 'video'
  | 'assembly';

// packages/shared/src/types/character.ts

export interface CharacterVO {
  id: string;
  name: string;
  description: string;
  visualPrompt: string;
  visualNegative: string;
  states: Record<string, string> | null;
  episodeIds: number[];
  images: CharacterImageVO[];
}

export interface CharacterImageVO {
  id: string;
  imageType: string;
  imageUrl: string;
  stateName: string | null;
}

// packages/shared/src/types/scene.ts

export interface SceneVO {
  id: string;
  name: string;
  description: string;
  visualPrompt: string;
  visualNegative: string;
  variants: Record<string, string> | null;
  episodeIds: number[];
  images: SceneImageVO[];
}

export interface SceneImageVO {
  id: string;
  variant: string;
  imageUrl: string;
}

// packages/shared/src/types/shot.ts

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

// packages/shared/src/types/ws-events.ts

/** 服务端 → 客户端 WebSocket 事件 */
export type WsServerEvent =
  | { event: 'step:start'; data: { step: string } }
  | { event: 'step:complete'; data: { step: string } }
  | { event: 'step:need_review'; data: { step: string } }
  | { event: 'step:failed'; data: { step: string; error: string } }
  | { event: 'asset:character:image'; data: { characterId: string; imageType: string; imageUrl: string } }
  | { event: 'asset:scene:complete'; data: { sceneId: string } }
  | { event: 'anchor:shot:complete'; data: { shotId: string; firstFrameUrl: string; lastFrameUrl: string } }
  | { event: 'video:shot:complete'; data: { shotId: string; episodeId: string; videoUrl: string } }
  | { event: 'assembly:episode:complete'; data: { episodeId: string; episodeNumber: number; videoUrl: string } }
  | { event: 'project:complete'; data: Record<string, never> };

/** 客户端 → 服务端 WebSocket 事件 */
export type WsClientEvent =
  | { event: 'subscribe'; data: { projectId: string } }
  | { event: 'unsubscribe'; data: { projectId: string } };

// packages/shared/src/types/project.ts

export interface ProjectVO {
  id: string;
  name: string;
  status: string;
  currentStep: string;
  createdAt: string;
  updatedAt: string;
}

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
```

```typescript
// packages/shared/src/index.ts — 统一导出

export * from './enums/project-status';
export * from './enums/shot-type';
export * from './constants/limits';
export * from './constants/pipeline';
export * from './types/pipeline';
export * from './types/project';
export * from './types/character';
export * from './types/scene';
export * from './types/shot';
export * from './types/ws-events';
```

> 后续新增任何前后端共享的类型、常量、枚举，都加在 `@aicomic/shared` 中。修改接口时只要保持这里的类型定义不变，前后端就不会出现对接不一致的问题。

---

## 五、后端核心实现

### 5.1 AI Provider 适配层

这是所有AI调用的统一抽象层，后续换供应商只改这里。

#### 5.1.1 LLM Provider

```typescript
// server/src/providers/llm/llm.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

@Injectable()
export class LLMService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('LLM_BASE_URL');
    this.apiKey = config.get('LLM_API_KEY');
    this.model = config.get('LLM_MODEL');
  }

  async chat(messages: LLMChatMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json' | 'text';
  }): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 16000,
        response_format: options?.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`LLM API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  /**
   * 便捷方法：发送JSON格式请求，自动解析返回
   */
  async chatJSON<T>(messages: LLMChatMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    const response = await this.chat(messages, {
      ...options,
      responseFormat: 'json',
    });

    const data = JSON.parse(response.content) as T;
    return { data, usage: response.usage };
  }
}
```

#### 5.1.2 图片生成 Provider

```typescript
// server/src/providers/image-gen/image-gen.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;    // 参考图（角色定妆照/场景锚图）
  referenceStrength?: number;    // 参考强度 0-1
  width?: number;
  height?: number;
  style?: string;
}

export interface ImageGenResponse {
  imageUrl: string;  // 生成的图片URL
  cost: number;      // 花费
}

@Injectable()
export class ImageGenService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('IMAGE_GEN_BASE_URL');
    this.apiKey = config.get('IMAGE_GEN_API_KEY');
    this.model = config.get('IMAGE_GEN_MODEL');
  }

  async generate(request: ImageGenRequest): Promise<ImageGenResponse> {
    // 根据实际使用的API适配请求格式
    // 以下为通用示例，具体根据供应商文档调整
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        size: `${request.width || 1920}x${request.height || 1080}`,
        // 参考图相关参数（根据供应商不同调整）
        ...(request.referenceImageUrl && {
          reference_image: request.referenceImageUrl,
          reference_strength: request.referenceStrength || 0.6,
        }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Image API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      imageUrl: data.data[0].url,
      cost: 0, // 根据供应商计费规则计算
    };
  }
}
```

#### 5.1.3 视频生成 Provider

```typescript
// server/src/providers/video-gen/video-gen.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VideoGenRequest {
  firstFrameUrl: string;       // 首帧图片URL
  lastFrameUrl?: string;       // 尾帧图片URL（可选）
  prompt: string;              // 运动/动作描述
  duration: number;            // 时长（4-12秒）
}

export interface VideoGenResponse {
  taskId: string;              // 异步任务ID（视频生成通常是异步的）
}

export interface VideoGenResult {
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  cost?: number;
}

@Injectable()
export class VideoGenService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('VIDEO_GEN_BASE_URL');
    this.apiKey = config.get('VIDEO_GEN_API_KEY');
    this.model = config.get('VIDEO_GEN_MODEL');
  }

  /**
   * 提交视频生成任务（异步，返回任务ID）
   */
  async submit(request: VideoGenRequest): Promise<VideoGenResponse> {
    const response = await fetch(`${this.baseUrl}/video/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        first_frame_image: request.firstFrameUrl,
        last_frame_image: request.lastFrameUrl,
        prompt: request.prompt,
        duration: request.duration,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Video API error: ${data.error?.message || 'Unknown error'}`);
    }

    return { taskId: data.task_id || data.id };
  }

  /**
   * 查询视频生成结果（轮询直到完成）
   */
  async getResult(taskId: string): Promise<VideoGenResult> {
    const response = await fetch(`${this.baseUrl}/video/generations/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Video API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      status: data.status === 'completed' ? 'completed'
            : data.status === 'failed' ? 'failed'
            : 'processing',
      videoUrl: data.video_url || data.output?.video_url,
      cost: data.cost,
    };
  }

  /**
   * 提交并等待完成（轮询封装）
   */
  async generateAndWait(request: VideoGenRequest, pollIntervalMs = 5000, timeoutMs = 300000): Promise<VideoGenResult> {
    const { taskId } = await this.submit(request);

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getResult(taskId);
      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Video generation timeout after ${timeoutMs}ms`);
  }
}
```

#### 5.1.4 文件存储 Provider

```typescript
// server/src/providers/storage/storage.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT'),
      port: Number(config.get('MINIO_PORT')),
      useSSL: false,
      accessKey: config.get('MINIO_ACCESS_KEY'),
      secretKey: config.get('MINIO_SECRET_KEY'),
    });
    this.bucket = config.get('MINIO_BUCKET');
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  /**
   * 上传文件（从Buffer）
   */
  async uploadBuffer(buffer: Buffer, path: string, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, path, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return this.getFileUrl(path);
  }

  /**
   * 从URL下载文件并存储
   */
  async uploadFromUrl(sourceUrl: string, path: string): Promise<string> {
    const response = await fetch(sourceUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return this.uploadBuffer(buffer, path, contentType);
  }

  /**
   * 获取文件访问URL
   */
  getFileUrl(path: string): string {
    const endpoint = this.config.get('MINIO_ENDPOINT');
    const port = this.config.get('MINIO_PORT');
    return `http://${endpoint}:${port}/${this.bucket}/${path}`;
  }

  /**
   * 生成存储路径
   */
  generatePath(projectId: string, category: string, extension: string): string {
    return `projects/${projectId}/${category}/${uuid()}.${extension}`;
  }
}
```

---

### 5.2 流水线编排器

```typescript
// server/src/pipeline/pipeline.orchestrator.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AnalysisService } from '../steps/analysis/analysis.service';
import { AssetService } from '../steps/asset/asset.service';
import { StoryboardService } from '../steps/storyboard/storyboard.service';
import { AnchorService } from '../steps/anchor/anchor.service';
import { VideoService } from '../steps/video/video.service';
import { AssemblyService } from '../steps/assembly/assembly.service';
import { WsGateway } from '../common/ws.gateway';
import { PipelineStep, PIPELINE_STEP_ORDER, PIPELINE_REVIEW_STEPS } from '@aicomic/shared';

@Injectable()
export class PipelineOrchestrator {
  private readonly logger = new Logger(PipelineOrchestrator.name);

  constructor(
    private prisma: PrismaService,
    private analysisService: AnalysisService,
    private assetService: AssetService,
    private storyboardService: StoryboardService,
    private anchorService: AnchorService,
    private videoService: VideoService,
    private assemblyService: AssemblyService,
    private ws: WsGateway,
  ) {}

  /**
   * 从指定步骤开始执行流水线
   */
  async executeFrom(projectId: string, fromStep: PipelineStep) {
    const startIndex = PIPELINE_STEP_ORDER.indexOf(fromStep);

    for (let i = startIndex; i < PIPELINE_STEP_ORDER.length; i++) {
      const step = PIPELINE_STEP_ORDER[i];

      // 更新项目状态
      await this.prisma.project.update({
        where: { id: projectId },
        data: { currentStep: step, status: `${step}_processing` },
      });

      // 通知前端
      this.ws.emitToProject(projectId, 'step:start', { step });

      try {
        await this.executeStep(projectId, step);

        // 通知前端步骤完成
        this.ws.emitToProject(projectId, 'step:complete', { step });

        this.logger.log(`Project ${projectId} - Step ${step} completed`);

        // 需要用户确认的步骤，暂停流水线
        if (PIPELINE_REVIEW_STEPS.includes(step)) {
          await this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'asset_review' },
          });
          this.ws.emitToProject(projectId, 'step:need_review', { step });
          return; // 暂停，等用户确认后手动调用 continueAfterAssetReview()
        }

      } catch (error) {
        this.logger.error(`Project ${projectId} - Step ${step} failed: ${error.message}`);

        await this.prisma.project.update({
          where: { id: projectId },
          data: { status: 'failed', currentStep: step },
        });

        this.ws.emitToProject(projectId, 'step:failed', {
          step,
          error: error.message,
        });

        throw error;
      }
    }

    // 全部完成
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'completed' },
    });
    this.ws.emitToProject(projectId, 'project:complete', {});
  }

  /**
   * 用户确认资产后，继续执行后续步骤
   */
  async continueAfterAssetReview(projectId: string) {
    await this.executeFrom(projectId, 'storyboard');
  }

  /**
   * 从某个步骤重跑
   */
  async restartFrom(projectId: string, fromStep: PipelineStep) {
    // 清除该步骤及之后的所有产物
    await this.clearOutputsFrom(projectId, fromStep);
    // 重新执行
    await this.executeFrom(projectId, fromStep);
  }

  /**
   * 重新生成单个镜头（从指定子步骤开始）
   */
  async retrySingleShot(shotId: string, fromStep: 'anchor' | 'video') {
    if (fromStep === 'anchor') {
      await this.anchorService.generateForShot(shotId);
      await this.videoService.generateForShot(shotId);
    } else {
      await this.videoService.generateForShot(shotId);
    }
  }

  // ========== 私有方法 ==========

  private async executeStep(projectId: string, step: PipelineStep) {
    switch (step) {
      case 'analysis':
        return this.analysisService.execute(projectId);
      case 'asset':
        return this.assetService.execute(projectId);
      case 'storyboard':
        return this.storyboardService.execute(projectId);
      case 'anchor':
        return this.anchorService.execute(projectId);
      case 'video':
        return this.videoService.execute(projectId);
      case 'assembly':
        return this.assemblyService.execute(projectId);
    }
  }

  private async clearOutputsFrom(projectId: string, fromStep: PipelineStep) {
    const startIndex = PIPELINE_STEP_ORDER.indexOf(fromStep);
    const stepsToClear = PIPELINE_STEP_ORDER.slice(startIndex);

    for (const step of stepsToClear) {
      switch (step) {
        case 'analysis':
          await this.prisma.character.deleteMany({ where: { projectId } });
          await this.prisma.scene.deleteMany({ where: { projectId } });
          await this.prisma.episode.deleteMany({ where: { project: { id: projectId } } });
          break;
        case 'asset':
          await this.prisma.characterImage.deleteMany({
            where: { character: { projectId } },
          });
          await this.prisma.sceneImage.deleteMany({
            where: { scene: { projectId } },
          });
          break;
        case 'storyboard':
          await this.prisma.shot.deleteMany({
            where: { episode: { projectId } },
          });
          break;
        case 'anchor':
          await this.prisma.shotImage.deleteMany({
            where: { shot: { episode: { projectId } } },
          });
          break;
        case 'video':
          await this.prisma.shotVideo.deleteMany({
            where: { shot: { episode: { projectId } } },
          });
          break;
        case 'assembly':
          await this.prisma.finalVideo.deleteMany({
            where: { episode: { projectId } },
          });
          break;
      }
    }
  }
}
```

---

### 5.3 Step1：全文分析 + 智能分集

```typescript
// server/src/steps/analysis/analysis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';

// Step1 LLM输出的数据结构
interface AnalysisResult {
  characters: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    states?: Record<string, string>;
    appears_in_episodes: number[];
  }[];
  scenes: {
    name: string;
    description: string;
    visual_prompt: string;
    visual_negative: string;
    variants?: Record<string, string>;
    appears_in_episodes: number[];
  }[];
  episodes: {
    episode_number: number;
    title: string;
    summary: string;
    original_text: string;
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

  async execute(projectId: string): Promise<void> {
    // 1. 获取小说原文
    const novel = await this.prisma.novel.findUnique({
      where: { projectId },
    });

    if (!novel) {
      throw new Error('小说内容不存在');
    }

    // 2. 调用LLM进行全文分析
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(novel.originalText);

    this.logger.log(`Project ${projectId} - 开始全文分析，字数：${novel.charCount}`);

    const { data: result } = await this.llm.chatJSON<AnalysisResult>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 16000,
    });

    // 3. 存储角色
    const characterMap = new Map<string, string>(); // name → id
    for (let i = 0; i < result.characters.length; i++) {
      const char = result.characters[i];
      const created = await this.prisma.character.create({
        data: {
          projectId,
          name: char.name,
          description: char.description,
          visualPrompt: char.visual_prompt,
          visualNegative: char.visual_negative,
          states: char.states || null,
          episodeIds: char.appears_in_episodes,
          sortOrder: i,
        },
      });
      characterMap.set(char.name, created.id);
    }

    // 4. 存储场景
    const sceneMap = new Map<string, string>(); // name → id
    for (let i = 0; i < result.scenes.length; i++) {
      const scene = result.scenes[i];
      const created = await this.prisma.scene.create({
        data: {
          projectId,
          name: scene.name,
          description: scene.description,
          visualPrompt: scene.visual_prompt,
          visualNegative: scene.visual_negative,
          variants: scene.variants || null,
          episodeIds: scene.appears_in_episodes,
          sortOrder: i,
        },
      });
      sceneMap.set(scene.name, created.id);
    }

    // 5. 存储分集
    for (const ep of result.episodes) {
      const characterIds = ep.character_names
        .map(name => characterMap.get(name))
        .filter(Boolean);
      const sceneIds = ep.scene_names
        .map(name => sceneMap.get(name))
        .filter(Boolean);

      await this.prisma.episode.create({
        data: {
          projectId,
          episodeNumber: ep.episode_number,
          title: ep.title,
          summary: ep.summary,
          originalText: ep.original_text,
          characterIds,
          sceneIds,
          emotionCurve: ep.emotion_curve,
          endingHook: ep.ending_hook,
          sortOrder: ep.episode_number,
        },
      });
    }

    this.logger.log(
      `Project ${projectId} - 分析完成：` +
      `${result.characters.length}个角色，` +
      `${result.scenes.length}个场景，` +
      `${result.episodes.length}集`
    );
  }

  // ==================== 提示词模板 ====================

  private buildSystemPrompt(): string {
    return `你是一位专业的3D动漫短剧策划师和编剧。你的任务是分析一篇短篇小说，完成三项工作：

1. **角色提取**：识别所有有台词或重要戏份的角色
2. **场景提取**：识别所有出现的场景/地点
3. **分集规划**：将故事拆分为多集短剧

## 角色提取要求

- 为每个角色生成完整的英文视觉描述（visual_prompt），用于AI图像生成
- 视觉描述必须包含：性别、年龄、体型、发型发色、面部特征、服装、整体风格
- 所有视觉描述统一使用以下基础风格前缀：3d anime style, cel-shading, cinematic lighting
- 小说中未明确描写的外貌，根据角色身份、性格、年代背景合理补充
- 如果角色在故事中有明显的状态变化（如生/死、变装、受伤），在states字段中为每种状态分别提供视觉描述
- visual_negative 用于排除不想要的风格元素，通常包含：realistic, photographic, western, modern（根据作品年代调整）

## 场景提取要求

- 为每个场景生成完整的英文视觉描述（visual_prompt）
- 必须包含：场景类型（室内/室外）、空间布局、关键物件、光照条件、整体氛围
- 同样使用 3d anime style 前缀
- 如果同一场景在不同时段/天气下出现，在variants字段中提供变体描述
- 变体只改变光照和氛围，不改变空间布局和物件位置

## 分集规划要求

- 每集适合制作2-3分钟的短剧视频
- 每集必须有独立的起承转合
- 每集结尾必须有悬念钩子，吸引观众看下一集
- 短剧第一集的开头必须在5秒内抓住观众注意力
- 保持原著的叙事风格和情感基调
- original_text 字段存放该集对应的原文内容（完整复制，不要省略）

## 输出格式

严格按照JSON格式输出，不要包含任何其他文字：

{
  "characters": [
    {
      "name": "角色中文名",
      "description": "角色简介（中文，2-3句话，包含性格和角色功能）",
      "visual_prompt": "3d anime style, cel-shading, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ... (英文负面提示词)",
      "states": {"状态名": "该状态下的完整英文视觉描述"} 或 null,
      "appears_in_episodes": [1, 2, 3]
    }
  ],
  "scenes": [
    {
      "name": "场景中文名",
      "description": "场景简介（中文）",
      "visual_prompt": "3d anime style, ... (完整英文视觉描述)",
      "visual_negative": "realistic, photographic, ...",
      "variants": {"night": "在默认描述基础上的夜晚变体", "storm": "暴风雨变体"} 或 null,
      "appears_in_episodes": [1, 3]
    }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "集标题",
      "summary": "剧情摘要（中文，3-5句话）",
      "original_text": "该集对应的完整原文",
      "character_names": ["角色A", "角色B"],
      "scene_names": ["场景A", "场景B"],
      "emotion_curve": "平静 → 温馨 → 不安 → 震惊",
      "ending_hook": "悬念描述"
    }
  ]
}`;
  }

  private buildUserPrompt(novelText: string): string {
    return `请分析以下短篇小说：

${novelText}`;
  }
}
```

---

### 5.4 Step2：视觉资产生成

```typescript
// server/src/steps/asset/asset.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private prisma: PrismaService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string): Promise<void> {
    const characters = await this.prisma.character.findMany({
      where: { projectId },
    });
    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
    });

    // 并行生成所有角色定妆照和场景锚图
    const tasks: Promise<void>[] = [];

    for (const character of characters) {
      tasks.push(this.generateCharacterImages(projectId, character));
    }

    for (const scene of scenes) {
      tasks.push(this.generateSceneImages(projectId, scene));
    }

    await Promise.all(tasks);

    this.logger.log(`Project ${projectId} - 视觉资产生成完成`);
  }

  /**
   * 为单个角色生成定妆照
   */
  private async generateCharacterImages(projectId: string, character: any): Promise<void> {
    // 定义要生成的图片类型
    const imageTypes = [
      { type: 'front', desc: 'front view, full body, standing pose, facing camera' },
      { type: 'side', desc: 'side view, full body, profile view' },
      { type: 'expression_happy', desc: 'close-up portrait, happy smiling expression' },
      { type: 'expression_sad', desc: 'close-up portrait, sad melancholy expression' },
      { type: 'expression_angry', desc: 'close-up portrait, angry fierce expression' },
      { type: 'expression_fear', desc: 'close-up portrait, fearful terrified expression' },
    ];

    // 默认状态的定妆照
    for (const imgType of imageTypes) {
      const prompt = `${character.visualPrompt}, ${imgType.desc}, white background, character sheet, high quality, detailed`;

      const result = await this.imageGen.generate({
        prompt,
        negativePrompt: character.visualNegative,
        width: 1024,
        height: 1024,
      });

      // 下载并存储到MinIO
      const storagePath = this.storage.generatePath(projectId, 'characters', 'png');
      const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);

      await this.prisma.characterImage.create({
        data: {
          characterId: character.id,
          imageType: imgType.type,
          imageUrl: localUrl,
          stateName: null, // 默认状态
        },
      });

      // 通知前端
      this.ws.emitToProject(projectId, 'asset:character:image', {
        characterId: character.id,
        imageType: imgType.type,
        imageUrl: localUrl,
      });
    }

    // 如果有状态变体（如鬼魂状态），为每个变体生成正面照
    const states = character.states as Record<string, string> | null;
    if (states) {
      for (const [stateName, statePrompt] of Object.entries(states)) {
        const prompt = `${statePrompt}, front view, full body, facing camera, white background, character sheet, high quality`;

        const result = await this.imageGen.generate({
          prompt,
          negativePrompt: character.visualNegative,
          width: 1024,
          height: 1024,
        });

        const storagePath = this.storage.generatePath(projectId, 'characters', 'png');
        const localUrl = await this.storage.uploadFromUrl(result.imageUrl, storagePath);

        await this.prisma.characterImage.create({
          data: {
            characterId: character.id,
            imageType: 'front',
            imageUrl: localUrl,
            stateName,
          },
        });
      }
    }
  }

  /**
   * 为单个场景生成锚图
   */
  private async generateSceneImages(projectId: string, scene: any): Promise<void> {
    // 生成默认全景锚图
    const defaultPrompt = `${scene.visualPrompt}, wide shot, establishing shot, full environment view, 16:9 aspect ratio, high quality, detailed background`;

    const defaultResult = await this.imageGen.generate({
      prompt: defaultPrompt,
      negativePrompt: scene.visualNegative,
      width: 1920,
      height: 1080,
    });

    const defaultPath = this.storage.generatePath(projectId, 'scenes', 'png');
    const defaultUrl = await this.storage.uploadFromUrl(defaultResult.imageUrl, defaultPath);

    await this.prisma.sceneImage.create({
      data: {
        sceneId: scene.id,
        variant: 'default',
        imageUrl: defaultUrl,
      },
    });

    // 生成氛围变体
    const variants = scene.variants as Record<string, string> | null;
    if (variants) {
      for (const [variantName, variantDesc] of Object.entries(variants)) {
        // 变体基于默认锚图做风格调整，使用img2img + 参考图
        const variantPrompt = `${scene.visualPrompt}, ${variantDesc}, wide shot, establishing shot, 16:9, high quality`;

        const variantResult = await this.imageGen.generate({
          prompt: variantPrompt,
          negativePrompt: scene.visualNegative,
          referenceImageUrl: defaultUrl,   // 参考默认锚图保持布局一致
          referenceStrength: 0.7,          // 较高参考强度
          width: 1920,
          height: 1080,
        });

        const variantPath = this.storage.generatePath(projectId, 'scenes', 'png');
        const variantUrl = await this.storage.uploadFromUrl(variantResult.imageUrl, variantPath);

        await this.prisma.sceneImage.create({
          data: {
            sceneId: scene.id,
            variant: variantName,
            imageUrl: variantUrl,
          },
        });
      }
    }

    this.ws.emitToProject(projectId, 'asset:scene:complete', {
      sceneId: scene.id,
    });
  }
}
```

---

### 5.5 Step3：分镜生成

```typescript
// server/src/steps/storyboard/storyboard.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LLMService } from '../../providers/llm/llm.service';
import { WsGateway } from '../../common/ws.gateway';

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

  async execute(projectId: string): Promise<void> {
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

    // 逐集生成分镜（可并行，但为了节省LLM调用可串行）
    for (const episode of episodes) {
      await this.generateForEpisode(projectId, episode, characters, scenes);

      this.ws.emitToProject(projectId, 'storyboard:episode:complete', {
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
      });
    }
  }

  private async generateForEpisode(
    projectId: string,
    episode: any,
    characters: any[],
    scenes: any[],
  ): Promise<void> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(episode, characters, scenes);

    const { data: result } = await this.llm.chatJSON<StoryboardResult>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 16000,
    });

    // 构建名称到ID的映射
    const characterMap = new Map(characters.map(c => [c.name, c.id]));
    const sceneMap = new Map(scenes.map(s => [s.name, s.id]));

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
          dialogue: shot.dialogue,
          narration: shot.narration,
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
      `Episode ${episode.episodeNumber} - 生成 ${result.shots.length} 个镜头`
    );
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
    const characterDescs = characters.map(c =>
      `- ${c.name}：${c.description}\n  视觉描述：${c.visualPrompt}${c.states ? `\n  状态变体：${JSON.stringify(c.states)}` : ''}`
    ).join('\n');

    const sceneDescs = scenes.map(s =>
      `- ${s.name}：${s.description}\n  视觉描述：${s.visualPrompt}${s.variants ? `\n  氛围变体：${JSON.stringify(s.variants)}` : ''}`
    ).join('\n');

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
```

---

### 5.6 Step4：视觉锚点生成（首帧 + 尾帧）

```typescript
// server/src/steps/anchor/anchor.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ImageGenService } from '../../providers/image-gen/image-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';

@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);

  constructor(
    private prisma: PrismaService,
    private imageGen: ImageGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string): Promise<void> {
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      include: {
        shots: {
          include: {
            characters: { include: { character: { include: { images: true } } } },
            scene: { include: { images: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 所有镜头并行生成锚点图片
    const tasks: Promise<void>[] = [];

    for (const episode of episodes) {
      for (const shot of episode.shots) {
        tasks.push(this.generateForShot(shot.id));
      }
    }

    // 并行执行（可限制并发数避免API限流）
    await this.executeBatch(tasks, 5); // 最多5个并发

    this.logger.log(`Project ${projectId} - 视觉锚点生成完成`);
  }

  /**
   * 为单个镜头生成首帧和尾帧
   */
  async generateForShot(shotId: string): Promise<void> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: {
        characters: { include: { character: { include: { images: true } } } },
        scene: { include: { images: true } },
        episode: true,
      },
    });

    if (!shot) throw new Error(`Shot ${shotId} not found`);

    // 获取场景锚图（根据变体）
    const sceneImage = shot.scene.images.find(
      img => img.variant === (shot.sceneVariant || 'default')
    ) || shot.scene.images.find(img => img.variant === 'default');

    // 获取角色参考图
    const characterRefs = shot.characters.map(sc => {
      const img = sc.character.images.find(
        img => img.imageType === 'front' && img.stateName === (sc.characterState || null)
      );
      return img?.imageUrl;
    }).filter(Boolean);

    // 根据景别选择参考策略
    const referenceImageUrl = this.selectReference(shot.shotType, sceneImage?.imageUrl, characterRefs);
    const referenceStrength = this.getReferenceStrength(shot.shotType);

    // 生成首帧
    const firstFrameResult = await this.imageGen.generate({
      prompt: `${shot.imagePrompt}, first frame of scene, starting pose`,
      negativePrompt: shot.imageNegative,
      referenceImageUrl,
      referenceStrength,
      width: 1920,
      height: 1080,
    });

    const firstFramePath = this.storage.generatePath(
      shot.episode.projectId, 'anchors', 'png'
    );
    const firstFrameUrl = await this.storage.uploadFromUrl(
      firstFrameResult.imageUrl, firstFramePath
    );

    await this.prisma.shotImage.create({
      data: {
        shotId: shot.id,
        imageType: 'first_frame',
        imageUrl: firstFrameUrl,
      },
    });

    // 生成尾帧
    const lastFrameResult = await this.imageGen.generate({
      prompt: `${shot.imagePrompt}, last frame of scene, ending pose, ${shot.videoMotion} completed`,
      negativePrompt: shot.imageNegative,
      referenceImageUrl,
      referenceStrength,
      width: 1920,
      height: 1080,
    });

    const lastFramePath = this.storage.generatePath(
      shot.episode.projectId, 'anchors', 'png'
    );
    const lastFrameUrl = await this.storage.uploadFromUrl(
      lastFrameResult.imageUrl, lastFramePath
    );

    await this.prisma.shotImage.create({
      data: {
        shotId: shot.id,
        imageType: 'last_frame',
        imageUrl: lastFrameUrl,
      },
    });

    this.ws.emitToProject(shot.episode.projectId, 'anchor:shot:complete', {
      shotId: shot.id,
      firstFrameUrl,
      lastFrameUrl,
    });
  }

  /**
   * 根据景别选择参考图策略
   *
   * 全景/远景 → 场景锚图为主参考
   * 中景      → 场景锚图+角色参考（场景优先）
   * 近景/特写 → 角色参考为主
   */
  private selectReference(
    shotType: string,
    sceneImageUrl?: string,
    characterRefUrls?: string[],
  ): string | undefined {
    switch (shotType) {
      case 'wide':
      case 'high_angle':
        // 全景：场景锚图为主
        return sceneImageUrl;

      case 'medium':
      case 'over_shoulder':
        // 中景：场景锚图为主（角色参考通过prompt描述补充）
        return sceneImageUrl;

      case 'close_up':
      case 'extreme_close_up':
        // 特写：角色参考为主
        return characterRefUrls?.[0] || sceneImageUrl;

      default:
        return sceneImageUrl;
    }
  }

  /**
   * 根据景别调整参考强度
   */
  private getReferenceStrength(shotType: string): number {
    switch (shotType) {
      case 'wide':
        return 0.75;  // 全景需要高度参考场景
      case 'medium':
        return 0.6;
      case 'close_up':
      case 'extreme_close_up':
        return 0.5;   // 特写参考强度适中，避免背景干扰
      default:
        return 0.6;
    }
  }

  /**
   * 控制并发的批量执行
   */
  private async executeBatch(tasks: Promise<void>[], concurrency: number): Promise<void> {
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
      const wrapped = task.then(() => { executing.delete(wrapped); });
      executing.add(wrapped);

      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }
}
```

---

### 5.7 Step5：视频生成

```typescript
// server/src/steps/video/video.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { VideoGenService } from '../../providers/video-gen/video-gen.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private videoGen: VideoGenService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string): Promise<void> {
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      include: {
        shots: {
          include: { images: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 所有镜头并行生成视频
    const tasks: Promise<void>[] = [];

    for (const episode of episodes) {
      for (const shot of episode.shots) {
        tasks.push(this.generateForShot(shot.id));
      }
    }

    // 控制并发（视频生成API通常有严格的并发限制）
    await this.executeBatch(tasks, 3);

    this.logger.log(`Project ${projectId} - 视频生成完成`);
  }

  /**
   * 为单个镜头生成视频
   */
  async generateForShot(shotId: string): Promise<void> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
      include: {
        images: true,
        episode: true,
      },
    });

    if (!shot) throw new Error(`Shot ${shotId} not found`);

    const firstFrame = shot.images.find(img => img.imageType === 'first_frame');
    const lastFrame = shot.images.find(img => img.imageType === 'last_frame');

    if (!firstFrame) {
      throw new Error(`Shot ${shotId} missing first frame`);
    }

    // 构建视频生成的prompt
    // 包含运动描述 + 对话内容（让模型生成口型和音效）
    let videoPrompt = shot.videoMotion;

    // 如果有对话，加入对话内容让视频模型生成音画同步的效果
    const dialogues = shot.dialogue as any[] | null;
    if (dialogues && dialogues.length > 0) {
      const dialogueText = dialogues.map(d => `${d.speaker} says: "${d.text}"`).join('. ');
      videoPrompt += `. ${dialogueText}`;
    }

    // 调用视频生成API
    const result = await this.videoGen.generateAndWait({
      firstFrameUrl: firstFrame.imageUrl,
      lastFrameUrl: lastFrame?.imageUrl,
      prompt: videoPrompt,
      duration: shot.duration,
    });

    if (result.status === 'failed') {
      throw new Error(`Video generation failed for shot ${shotId}`);
    }

    // 下载并存储视频
    const storagePath = this.storage.generatePath(
      shot.episode.projectId, 'videos', 'mp4'
    );
    const localUrl = await this.storage.uploadFromUrl(result.videoUrl!, storagePath);

    await this.prisma.shotVideo.create({
      data: {
        shotId: shot.id,
        videoUrl: localUrl,
        actualDuration: shot.duration,
      },
    });

    this.ws.emitToProject(shot.episode.projectId, 'video:shot:complete', {
      shotId: shot.id,
      episodeId: shot.episodeId,
      videoUrl: localUrl,
    });
  }

  private async executeBatch(tasks: Promise<void>[], concurrency: number): Promise<void> {
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
      const wrapped = task.then(() => { executing.delete(wrapped); });
      executing.add(wrapped);

      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }
}
```

---

### 5.8 Step6：组装输出

```typescript
// server/src/steps/assembly/assembly.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

@Injectable()
export class AssemblyService {
  private readonly logger = new Logger(AssemblyService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string): Promise<void> {
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      include: {
        shots: {
          include: { video: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const episode of episodes) {
      await this.assembleEpisode(projectId, episode);
    }
  }

  private async assembleEpisode(projectId: string, episode: any): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `aicomic-${projectId}-ep${episode.episodeNumber}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // 1. 下载所有镜头视频到本地临时目录
      const videoFiles: string[] = [];
      for (let i = 0; i < episode.shots.length; i++) {
        const shot = episode.shots[i];
        if (!shot.video) {
          this.logger.warn(`Shot ${shot.id} has no video, skipping`);
          continue;
        }

        const localPath = path.join(tmpDir, `shot_${String(i).padStart(3, '0')}.mp4`);
        const response = await fetch(shot.video.videoUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(localPath, buffer);
        videoFiles.push(localPath);
      }

      if (videoFiles.length === 0) {
        throw new Error(`Episode ${episode.episodeNumber} has no video files`);
      }

      // 2. 生成字幕文件（SRT格式）
      const srtPath = path.join(tmpDir, 'subtitles.srt');
      const srtContent = this.generateSRT(episode.shots);
      fs.writeFileSync(srtPath, srtContent, 'utf-8');

      // 3. 生成FFmpeg拼接列表
      const concatListPath = path.join(tmpDir, 'concat_list.txt');
      const concatContent = videoFiles.map(f => `file '${f}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent);

      // 4. FFmpeg拼接 + 烧录字幕
      const outputPath = path.join(tmpDir, 'final.mp4');

      await execFileAsync('ffmpeg', [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-vf', `subtitles=${srtPath}:force_style='FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-y',
        outputPath,
      ]);

      // 5. 上传成片到存储
      const videoBuffer = fs.readFileSync(outputPath);
      const storagePath = this.storage.generatePath(projectId, 'finals', 'mp4');
      const finalUrl = await this.storage.uploadBuffer(videoBuffer, storagePath, 'video/mp4');

      // 6. 保存记录
      await this.prisma.finalVideo.create({
        data: {
          episodeId: episode.id,
          videoUrl: finalUrl,
        },
      });

      this.ws.emitToProject(projectId, 'assembly:episode:complete', {
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        videoUrl: finalUrl,
      });

      this.logger.log(`Episode ${episode.episodeNumber} assembled: ${finalUrl}`);

    } finally {
      // 清理临时文件
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * 根据分镜的对话和旁白生成SRT字幕
   */
  private generateSRT(shots: any[]): string {
    const entries: string[] = [];
    let index = 1;
    let currentTime = 0; // 秒

    for (const shot of shots) {
      const startTime = currentTime;
      const endTime = currentTime + shot.duration;

      // 对话字幕
      const dialogues = shot.dialogue as any[] | null;
      if (dialogues) {
        for (const d of dialogues) {
          entries.push(
            `${index}\n` +
            `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n` +
            `${d.speaker}：${d.text}\n`
          );
          index++;
        }
      }

      // 旁白字幕
      const narration = shot.narration as any | null;
      if (narration) {
        entries.push(
          `${index}\n` +
          `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n` +
          `${narration.text}\n`
        );
        index++;
      }

      currentTime = endTime;
    }

    return entries.join('\n');
  }

  /**
   * 格式化时间为SRT格式：HH:MM:SS,mmm
   */
  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
}
```

---

## 六、前端核心页面

### 6.1 路由结构

```typescript
// web/src/router/index.ts

import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/project/:id',
    name: 'Project',
    component: () => import('@/views/project/ProjectView.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'ProjectOverview' } },
      { path: 'overview', name: 'ProjectOverview', component: () => import('@/views/project/OverviewPanel.vue') },
      { path: 'episodes', name: 'ProjectEpisodes', component: () => import('@/views/project/EpisodesPanel.vue') },
      { path: 'assets', name: 'ProjectAssets', component: () => import('@/views/project/AssetsPanel.vue') },
      { path: 'storyboard/:episodeId', name: 'ProjectStoryboard', component: () => import('@/views/project/StoryboardPanel.vue') },
      { path: 'generation', name: 'ProjectGeneration', component: () => import('@/views/project/GenerationPanel.vue') },
      { path: 'preview', name: 'ProjectPreview', component: () => import('@/views/project/PreviewPanel.vue') },
    ],
  },
  {
    path: '/billing',
    name: 'Billing',
    component: () => import('@/views/billing/BillingView.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router;
```

### 6.2 项目主页面流程

```vue
<!-- web/src/views/project/ProjectView.vue -->
<!--
  项目详情页：左侧步骤导航 + 右侧内容面板

  步骤导航：
  ① 概览（上传小说）
  ② 分集预览（Step1结果）
  ③ 视觉资产（Step2结果，需确认）
  ④ 分镜编辑（Step3结果）
  ⑤ 生成监控（Step4+5进度）
  ⑥ 成片预览（Step6结果）

  每个步骤面板根据项目当前状态决定是否可用：
  - 当前步骤和已完成步骤 → 可访问
  - 未来步骤 → 置灰不可点击
-->
```

### 6.3 WebSocket 连接（原生）

```typescript
// web/src/composables/useWebSocket.ts

import { ref, onUnmounted } from 'vue';
import { useProjectStore } from '@/stores/project';
import type { WsServerEvent, WsClientEvent } from '@aicomic/shared';

const WS_BASE_URL = 'ws://localhost:3000/ws';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function useWebSocket() {
  const connected = ref(false);

  function connect(projectId: string) {
    disconnect();

    const token = localStorage.getItem('token');
    ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

    ws.onopen = () => {
      connected.value = true;
      // 订阅项目频道
      send({ event: 'subscribe', data: { projectId } });
    };

    ws.onmessage = (rawEvent) => {
      const message: WsServerEvent = JSON.parse(rawEvent.data);
      handleMessage(message);
    };

    ws.onclose = () => {
      connected.value = false;
      // 自动重连
      reconnectTimer = setTimeout(() => connect(projectId), 3000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function send(message: WsClientEvent) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null; // 阻止自动重连
      ws.close();
      ws = null;
    }
    connected.value = false;
  }

  function handleMessage(message: WsServerEvent) {
    const projectStore = useProjectStore();

    switch (message.event) {
      case 'step:start':
        projectStore.setCurrentStep(message.data.step);
        break;
      case 'step:complete':
        projectStore.markStepComplete(message.data.step);
        break;
      case 'step:need_review':
        projectStore.setNeedReview(message.data.step);
        break;
      case 'step:failed':
        projectStore.setStepFailed(message.data.step, message.data.error);
        break;
      case 'asset:character:image':
        projectStore.addCharacterImage(
          message.data.characterId,
          message.data.imageType,
          message.data.imageUrl,
        );
        break;
      case 'anchor:shot:complete':
        projectStore.setShotAnchors(
          message.data.shotId,
          message.data.firstFrameUrl,
          message.data.lastFrameUrl,
        );
        break;
      case 'video:shot:complete':
        projectStore.setShotVideo(message.data.shotId, message.data.videoUrl);
        break;
      case 'assembly:episode:complete':
        projectStore.setEpisodeVideo(message.data.episodeId, message.data.videoUrl);
        break;
      case 'project:complete':
        projectStore.setProjectComplete();
        break;
    }
  }

  onUnmounted(() => disconnect());

  return { connected, connect, disconnect };
}
```

### 6.4 后端 WebSocket Gateway（原生 ws）

```typescript
// server/src/common/ws.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import type { WsServerEvent } from '@aicomic/shared';
import { IncomingMessage } from 'http';
import * as url from 'url';

interface ClientInfo {
  ws: WebSocket;
  projectIds: Set<string>;
}

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server: Server;

  /** 所有已连接的客户端 */
  private clients = new Map<WebSocket, ClientInfo>();

  handleConnection(client: WebSocket, req: IncomingMessage) {
    // 从URL中提取token进行鉴权（简化版，生产环境建议用更安全的方式）
    const params = url.parse(req.url || '', true).query;
    const token = params.token as string;

    // TODO: 验证JWT token，获取userId

    this.clients.set(client, { ws: client, projectIds: new Set() });
    this.logger.log(`Client connected, total: ${this.clients.size}`);

    // 监听客户端消息
    client.on('message', (raw: string) => {
      try {
        const message = JSON.parse(raw.toString());
        this.handleClientMessage(client, message);
      } catch (e) {
        this.logger.warn(`Invalid message from client: ${raw}`);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.log(`Client disconnected, total: ${this.clients.size}`);
  }

  /**
   * 处理客户端消息（订阅/取消订阅项目）
   */
  private handleClientMessage(client: WebSocket, message: any) {
    const info = this.clients.get(client);
    if (!info) return;

    if (message.event === 'subscribe' && message.data?.projectId) {
      info.projectIds.add(message.data.projectId);
    } else if (message.event === 'unsubscribe' && message.data?.projectId) {
      info.projectIds.delete(message.data.projectId);
    }
  }

  /**
   * 向订阅了指定项目的所有客户端推送事件
   * 这是各 Step Service 调用的统一方法
   */
  emitToProject(projectId: string, event: WsServerEvent['event'], data: any) {
    const message = JSON.stringify({ event, data });

    for (const [, info] of this.clients) {
      if (info.projectIds.has(projectId) && info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(message);
      }
    }
  }
}
```

> 注意：所有 Step Service 中的 `SocketGateway` 引用统一替换为 `WsGateway`，方法签名 `emitToProject(projectId, event, data)` 保持不变。

---

## 七、API 接口清单

### 7.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，返回JWT |
| GET | `/api/auth/profile` | 获取当前用户信息 |

### 7.2 项目

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取我的项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/:id` | 获取项目详情（含当前状态） |
| DELETE | `/api/projects/:id` | 删除项目 |

### 7.3 小说上传与流水线控制

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects/:id/novel` | 上传小说文本 |
| POST | `/api/projects/:id/pipeline/start` | 开始流水线（从Step1开始） |
| POST | `/api/projects/:id/pipeline/confirm-assets` | 确认资产，继续流水线 |
| POST | `/api/projects/:id/pipeline/restart/:step` | 从指定步骤重跑 |
| POST | `/api/shots/:id/retry/:step` | 重新生成单个镜头 |

### 7.4 数据查询

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:id/episodes` | 获取分集列表 |
| PUT | `/api/episodes/:id` | 修改集信息（标题、摘要等） |
| GET | `/api/projects/:id/characters` | 获取角色列表（含定妆照） |
| GET | `/api/projects/:id/scenes` | 获取场景列表（含锚图） |
| GET | `/api/episodes/:id/shots` | 获取某集的分镜列表 |
| PUT | `/api/shots/:id` | 修改镜头信息 |
| GET | `/api/episodes/:id/final-video` | 获取某集的成片 |

### 7.5 计费

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/billing/recharge` | 充值 |
| GET | `/api/billing/balance` | 查询余额 |
| GET | `/api/billing/records` | 消费记录 |

---

## 八、部署与运行

### 8.1 本地开发

```bash
# 1. 启动基础设施
docker-compose up -d

# 2. 构建共享包
pnpm build:shared

# 3. 数据库迁移
pnpm db:migrate

# 4. 同时启动前后端
pnpm dev

# 或分别启动：
pnpm dev:server
pnpm dev:web
```

### 8.2 生产部署要点

```
- PostgreSQL、Redis 使用云服务（如阿里云RDS、Redis）
- MinIO 替换为阿里云OSS（只需改 StorageService 的实现）
- 后端部署：Docker容器 + Nginx反向代理
- 前端部署：Vite打包后放CDN或Nginx静态文件服务
- FFmpeg：需要在后端服务器上安装
- 域名 + HTTPS
```

---

## 九、开发顺序建议

```
Phase 1：基础骨架（1周）
  ✅ pnpm monorepo 工作区搭建
  ✅ @aicomic/shared 共享包（类型+常量+枚举）
  ✅ Docker Compose 搭建 PostgreSQL + Redis + MinIO
  ✅ NestJS 项目初始化 + Prisma Schema + 迁移
  ✅ 用户认证模块（注册/登录/JWT）
  ✅ 项目CRUD
  ✅ Vue 项目初始化 + 路由 + 登录页 + 项目列表页
  ✅ AI Provider 适配层（LLM/图片/视频）
  ✅ WebSocket Gateway（原生ws）

Phase 2：Step1 全文分析+分集（3-5天）
  ✅ 小说上传接口
  ✅ AnalysisService + 提示词调试
  ✅ 前端：分集预览页面
  ✅ 联调测试

Phase 3：Step2 视觉资产生成（3-5天）
  ✅ AssetService 角色定妆照生成
  ✅ AssetService 场景锚图生成
  ✅ 前端：资产预览+确认页面
  ✅ 重新生成功能

Phase 4：Step3 分镜生成（3-5天）
  ✅ StoryboardService + 提示词调试
  ✅ 前端：分镜列表展示
  ✅ 镜头信息编辑功能

Phase 5：Step4+5 锚点+视频生成（1周）
  ✅ AnchorService 首帧/尾帧生成
  ✅ VideoService 视频生成（轮询等待）
  ✅ 并发控制
  ✅ 前端：生成进度面板
  ✅ WebSocket实时推送

Phase 6：Step6 组装+输出（3-5天）
  ✅ FFmpeg拼接+字幕
  ✅ 前端：成片预览+下载
  ✅ 流水线编排器完整联调

Phase 7：打磨（持续）
  ✅ 错误处理与重试机制
  ✅ 计费系统
  ✅ UI美化
  ✅ 性能优化
```

---

## 十、关键提示词调试指南

提示词的质量直接决定生成效果。以下是调试建议：

### 10.1 Step1 分析提示词调试

```
测试方法：
1. 准备3-5篇不同类型的短篇小说（恐怖、言情、悬疑、科幻、校园）
2. 在Playground中单独测试提示词
3. 检查输出：
   - 角色是否遗漏？外貌描述是否合理？
   - 场景是否完整？变体是否合理？
   - 分集是否平衡？悬念是否到位？
   - JSON格式是否正确？字段是否齐全？
4. 迭代优化提示词中的要求描述

常见问题：
- 角色外貌描述太简略 → 在提示词中增加"必须包含：性别、年龄、体型..."的明确要求
- 分集不均匀 → 增加"每集对应的原文字数差异不超过30%"的约束
- JSON格式出错 → 使用 response_format: json 强制JSON输出
```

### 10.2 Step3 分镜提示词调试

```
测试方法：
1. 取Step1的真实输出作为输入
2. 逐集测试分镜生成
3. 检查输出：
   - image_prompt 是否包含完整角色视觉描述？（不能只写名字）
   - 是否每个镜头都在4-12秒范围内？
   - 连贯性标注是否合理？
   - 对话和旁白是否正确分配？
   - 情感节奏是否匹配 emotion_curve？
4. 对比原文，确认重要情节没有遗漏

常见问题：
- image_prompt中角色描述不完整 → 强调"必须从角色设定中复制完整的视觉特征"
- 镜头太多导致单集超时 → 增加"总镜头数控制在15-25个"的约束
- 转场单调 → 在示例中展示多种转场用法
```
