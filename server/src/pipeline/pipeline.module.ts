import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StepsModule } from '../steps/steps.module';
import { PipelineOrchestrator } from './pipeline.orchestrator';
import { PipelineProcessor } from './pipeline.processor';

@Module({
  imports: [
    StepsModule,
    BullModule.registerQueue({
      name: 'pipeline',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  providers: [PipelineOrchestrator, PipelineProcessor],
  exports: [PipelineOrchestrator],
})
export class PipelineModule {}
