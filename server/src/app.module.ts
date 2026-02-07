import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ProvidersModule } from './providers/providers.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    // BullMQ 全局 Redis 连接配置
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    // 公共模块（PrismaService, WsGateway, JwtModule — 全局）
    CommonModule,

    // AI 供应商适配层（LLM, ImageGen, VideoGen, Storage — 全局）
    ProvidersModule,

    // 流水线模块（编排器 + 处理器 + 所有步骤服务）
    PipelineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
