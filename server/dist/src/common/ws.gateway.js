"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const ws_1 = require("ws");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("./prisma.service");
const url = __importStar(require("url"));
let WsGateway = WsGateway_1 = class WsGateway {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(WsGateway_1.name);
        this.clients = new Map();
    }
    async handleConnection(client, req) {
        const params = url.parse(req.url || '', true).query;
        const token = params.token;
        if (!token) {
            this.logger.warn('WebSocket 连接缺少 token，拒绝连接');
            client.close(4001, 'Missing token');
            return;
        }
        try {
            const payload = this.jwtService.verify(token);
            const userId = payload.sub;
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                client.close(4002, 'User not found');
                return;
            }
            this.clients.set(client, { ws: client, userId, projectIds: new Set() });
            this.logger.log(`Client connected (user: ${userId}), total: ${this.clients.size}`);
        }
        catch (err) {
            this.logger.warn(`WebSocket JWT 验证失败: ${err.message}`);
            client.close(4003, 'Invalid token');
            return;
        }
        client.on('message', (raw) => {
            try {
                const message = JSON.parse(raw.toString());
                this.handleClientMessage(client, message);
            }
            catch (e) {
                this.logger.warn(`Invalid message from client: ${raw}`);
            }
        });
    }
    handleDisconnect(client) {
        this.clients.delete(client);
        this.logger.log(`Client disconnected, total: ${this.clients.size}`);
    }
    async handleClientMessage(client, message) {
        const info = this.clients.get(client);
        if (!info)
            return;
        if (message.event === 'subscribe' && message.data?.projectId) {
            const project = await this.prisma.project.findFirst({
                where: { id: message.data.projectId, userId: info.userId },
            });
            if (!project) {
                client.send(JSON.stringify({
                    event: 'error',
                    data: { message: '无权访问该项目' },
                }));
                return;
            }
            info.projectIds.add(message.data.projectId);
        }
        else if (message.event === 'unsubscribe' && message.data?.projectId) {
            info.projectIds.delete(message.data.projectId);
        }
    }
    emitToProject(projectId, event, data) {
        const message = JSON.stringify({ event, data });
        for (const [, info] of this.clients) {
            if (info.projectIds.has(projectId) && info.ws.readyState === ws_1.WebSocket.OPEN) {
                info.ws.send(message);
            }
        }
    }
};
exports.WsGateway = WsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], WsGateway.prototype, "server", void 0);
exports.WsGateway = WsGateway = WsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ path: '/ws' }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], WsGateway);
//# sourceMappingURL=ws.gateway.js.map