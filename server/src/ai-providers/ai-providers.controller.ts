import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AiProvidersService } from './ai-providers.service';

@Controller('ai-providers')
@UseGuards(AuthGuard)
export class AiProvidersController {
  constructor(private readonly service: AiProvidersService) {}

  @Get()
  list(@Req() req: any) { return this.service.list(req.user.sub); }

  @Post()
  create(@Req() req: any, @Body() body: { name: string; providerType: string; baseUrl: string; apiKey: string; model: string; isDefault?: boolean }) {
    return this.service.create(req.user.sub, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; baseUrl?: string; apiKey?: string; model?: string; isDefault?: boolean }) {
    return this.service.update(req.user.sub, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user.sub, id); }

  @Post('test')
  testConnection(@Req() req: any, @Body() body: { baseUrl: string; apiKey: string; model: string; providerType: string }) {
    return this.service.testConnection(req.user.sub, body);
  }
}
