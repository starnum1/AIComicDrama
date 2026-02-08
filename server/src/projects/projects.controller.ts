import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // ==================== 项目 CRUD ====================

  @Get('projects')
  async listProjects(@Req() req: any) {
    return this.projectsService.listProjects(req.user.sub);
  }

  @Post('projects')
  async createProject(@Req() req: any, @Body() body: { name: string }) {
    return this.projectsService.createProject(req.user.sub, body.name);
  }

  @Get('projects/:id')
  async getProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProject(req.user.sub, id);
  }

  @Delete('projects/:id')
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteProject(req.user.sub, id);
  }

  // ==================== AI 配置 ====================

  @Put('projects/:id/ai-config')
  async updateAiConfig(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      llmProviderId?: string | null;
      imageProviderId?: string | null;
      videoProviderId?: string | null;
    },
  ) {
    return this.projectsService.updateAiConfig(req.user.sub, id, body);
  }

  // ==================== 小说上传与流水线控制 ====================

  @Post('projects/:id/novel')
  async uploadNovel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    return this.projectsService.uploadNovel(req.user.sub, id, body.text);
  }

  @Post('projects/:id/pipeline/start')
  async startPipeline(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.startPipeline(req.user.sub, id);
  }

  @Post('projects/:id/pipeline/confirm-assets')
  async confirmAssets(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.confirmAssets(req.user.sub, id);
  }

  @Post('projects/:id/pipeline/continue')
  async continueStep(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.continueStep(req.user.sub, id);
  }

  @Post('projects/:id/pipeline/restart/:step')
  async restartStep(
    @Req() req: any,
    @Param('id') id: string,
    @Param('step') step: string,
  ) {
    return this.projectsService.restartStep(req.user.sub, id, step);
  }

  @Post('shots/:id/retry/:step')
  async retryShot(
    @Req() req: any,
    @Param('id') id: string,
    @Param('step') step: string,
  ) {
    return this.projectsService.retryShot(req.user.sub, id, step);
  }

  // ==================== 视觉资产生成 ====================

  /** 获取项目视觉资产（角色+场景+图片） */
  @Get('projects/:id/assets')
  async getProjectAssets(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProjectAssets(req.user.sub, id);
  }

  /** 为单个角色生成定妆照（三视图） */
  @Post('projects/:id/generate-character-image/:characterId')
  async generateCharacterImage(
    @Req() req: any,
    @Param('id') id: string,
    @Param('characterId') characterId: string,
    @Body() body: { imageProviderId?: string },
  ) {
    return this.projectsService.generateCharacterImage(
      req.user.sub,
      id,
      characterId,
      body.imageProviderId,
    );
  }

  /** 为单个场景生成锚图 */
  @Post('projects/:id/generate-scene-image/:sceneId')
  async generateSceneImage(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sceneId') sceneId: string,
    @Body() body: { variant?: string; imageProviderId?: string },
  ) {
    return this.projectsService.generateSceneImage(
      req.user.sub,
      id,
      sceneId,
      body.variant || 'default',
      body.imageProviderId,
    );
  }

  /** 一键生成所有缺失的资产 */
  @Post('projects/:id/generate-all-assets')
  async generateAllAssets(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { imageProviderId?: string },
  ) {
    return this.projectsService.generateAllAssets(
      req.user.sub,
      id,
      body.imageProviderId,
    );
  }

  /** 删除角色定妆照 */
  @Delete('character-sheets/:id')
  async deleteCharacterSheet(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteCharacterSheet(req.user.sub, id);
  }

  /** 删除场景锚图 */
  @Delete('scene-images/:id')
  async deleteSceneImage(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteSceneImage(req.user.sub, id);
  }

  // ==================== 兼容旧 API ====================

  @Get('projects/:id/character-sheets')
  async getCharacterSheets(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getCharacterSheets(req.user.sub, id);
  }

  @Delete('character-images/:id')
  async deleteCharacterImage(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteCharacterImage(req.user.sub, id);
  }

  // ==================== 数据查询 ====================

  @Get('projects/:id/episodes')
  async getEpisodes(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getEpisodes(req.user.sub, id);
  }

  @Put('episodes/:id')
  async updateEpisode(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { title?: string; summary?: string },
  ) {
    return this.projectsService.updateEpisode(req.user.sub, id, body);
  }

  @Get('projects/:id/characters')
  async getCharacters(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getCharacters(req.user.sub, id);
  }

  @Get('projects/:id/scenes')
  async getScenes(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getScenes(req.user.sub, id);
  }

  @Get('episodes/:id/shots')
  async getShots(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getShots(req.user.sub, id);
  }

  @Put('shots/:id')
  async updateShot(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      imagePrompt?: string;
      duration?: number;
      shotType?: string;
      cameraMovement?: string;
    },
  ) {
    return this.projectsService.updateShot(req.user.sub, id, body);
  }

  @Get('episodes/:id/final-video')
  async getFinalVideo(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getFinalVideo(req.user.sub, id);
  }
}
