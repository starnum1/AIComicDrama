"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const steps_module_1 = require("../steps/steps.module");
const pipeline_orchestrator_1 = require("./pipeline.orchestrator");
const pipeline_processor_1 = require("./pipeline.processor");
let PipelineModule = class PipelineModule {
};
exports.PipelineModule = PipelineModule;
exports.PipelineModule = PipelineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            steps_module_1.StepsModule,
            bullmq_1.BullModule.registerQueue({
                name: 'pipeline',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: 100,
                    removeOnFail: 200,
                },
            }),
        ],
        providers: [pipeline_orchestrator_1.PipelineOrchestrator, pipeline_processor_1.PipelineProcessor],
        exports: [pipeline_orchestrator_1.PipelineOrchestrator],
    })
], PipelineModule);
//# sourceMappingURL=pipeline.module.js.map