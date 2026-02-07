import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis/analysis.service';
import { AssetService } from './asset/asset.service';
import { StoryboardService } from './storyboard/storyboard.service';
import { AnchorService } from './anchor/anchor.service';
import { VideoService } from './video/video.service';
import { AssemblyService } from './assembly/assembly.service';

@Module({
  providers: [
    AnalysisService,
    AssetService,
    StoryboardService,
    AnchorService,
    VideoService,
    AssemblyService,
  ],
  exports: [
    AnalysisService,
    AssetService,
    StoryboardService,
    AnchorService,
    VideoService,
    AssemblyService,
  ],
})
export class StepsModule {}
