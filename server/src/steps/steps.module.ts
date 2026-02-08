import { Module } from '@nestjs/common';
import { AssetService } from './asset/asset.service';
import { EpisodeService } from './episode/episode.service';
import { StoryboardService } from './storyboard/storyboard.service';
import { AnchorService } from './anchor/anchor.service';
import { VideoService } from './video/video.service';
import { AssemblyService } from './assembly/assembly.service';

@Module({
  providers: [
    AssetService,
    EpisodeService,
    StoryboardService,
    AnchorService,
    VideoService,
    AssemblyService,
  ],
  exports: [
    AssetService,
    EpisodeService,
    StoryboardService,
    AnchorService,
    VideoService,
    AssemblyService,
  ],
})
export class StepsModule {}
