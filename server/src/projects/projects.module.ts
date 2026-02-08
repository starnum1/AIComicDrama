import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PipelineModule } from '../pipeline/pipeline.module';
import { StepsModule } from '../steps/steps.module';

@Module({
  imports: [PipelineModule, StepsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
