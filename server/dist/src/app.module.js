"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const common_module_1 = require("./common/common.module");
const providers_module_1 = require("./providers/providers.module");
const ai_providers_module_1 = require("./ai-providers/ai-providers.module");
const pipeline_module_1 = require("./pipeline/pipeline.module");
const auth_module_1 = require("./auth/auth.module");
const projects_module_1 = require("./projects/projects.module");
const billing_module_1 = require("./billing/billing.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '../.env',
            }),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: Number(process.env.REDIS_PORT) || 6379,
                },
            }),
            common_module_1.CommonModule,
            providers_module_1.ProvidersModule,
            ai_providers_module_1.AiProvidersModule,
            pipeline_module_1.PipelineModule,
            auth_module_1.AuthModule,
            projects_module_1.ProjectsModule,
            billing_module_1.BillingModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map