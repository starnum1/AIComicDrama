import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import type { WsServerEvent } from '@aicomic/shared';
import { IncomingMessage } from 'http';
export declare class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private prisma;
    private readonly logger;
    constructor(jwtService: JwtService, prisma: PrismaService);
    server: Server;
    private clients;
    handleConnection(client: WebSocket, req: IncomingMessage): Promise<void>;
    handleDisconnect(client: WebSocket): void;
    private handleClientMessage;
    emitToProject(projectId: string, event: WsServerEvent['event'], data: any): void;
}
