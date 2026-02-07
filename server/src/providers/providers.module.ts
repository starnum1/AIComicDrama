import { Global, Module } from '@nestjs/common';
import { LLMService } from './llm/llm.service';
import { ImageGenService } from './image-gen/image-gen.service';
import { VideoGenService } from './video-gen/video-gen.service';
import { StorageService } from './storage/storage.service';

@Global()
@Module({
  providers: [LLMService, ImageGenService, VideoGenService, StorageService],
  exports: [LLMService, ImageGenService, VideoGenService, StorageService],
})
export class ProvidersModule {}
