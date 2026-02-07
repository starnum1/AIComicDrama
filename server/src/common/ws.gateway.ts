import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import type { WsServerEvent } from '@aicomic/shared';
import { IncomingMessage } from 'http';
import * as url from 'url';

interface ClientInfo {
  ws: WebSocket;
  userId: string;
  projectIds: Set<string>;
}

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  @WebSocketServer()
  server: Server;

  /** 所有已连接的客户端 */
  private clients = new Map<WebSocket, ClientInfo>();

  async handleConnection(client: WebSocket, req: IncomingMessage) {
    // ========== JWT 鉴权 ==========
    const params = url.parse(req.url || '', true).query;
    const token = params.token as string;

    if (!token) {
      this.logger.warn('WebSocket 连接缺少 token，拒绝连接');
      client.close(4001, 'Missing token');
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub as string;

      // 验证用户是否存在
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        client.close(4002, 'User not found');
        return;
      }

      this.clients.set(client, { ws: client, userId, projectIds: new Set() });
      this.logger.log(`Client connected (user: ${userId}), total: ${this.clients.size}`);
    } catch (err) {
      this.logger.warn(`WebSocket JWT 验证失败: ${(err as Error).message}`);
      client.close(4003, 'Invalid token');
      return;
    }

    // 监听客户端消息
    client.on('message', (raw: Buffer | string) => {
      try {
        const message = JSON.parse(raw.toString());
        this.handleClientMessage(client, message);
      } catch (e) {
        this.logger.warn(`Invalid message from client: ${raw}`);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.log(`Client disconnected, total: ${this.clients.size}`);
  }

  /**
   * 处理客户端消息（订阅/取消订阅项目）
   * 订阅时校验该用户是否拥有该项目，防止越权访问
   */
  private async handleClientMessage(client: WebSocket, message: any) {
    const info = this.clients.get(client);
    if (!info) return;

    if (message.event === 'subscribe' && message.data?.projectId) {
      // 鉴权：校验项目归属
      const project = await this.prisma.project.findFirst({
        where: { id: message.data.projectId, userId: info.userId },
      });
      if (!project) {
        client.send(
          JSON.stringify({
            event: 'error',
            data: { message: '无权访问该项目' },
          }),
        );
        return;
      }
      info.projectIds.add(message.data.projectId);
    } else if (message.event === 'unsubscribe' && message.data?.projectId) {
      info.projectIds.delete(message.data.projectId);
    }
  }

  /**
   * 向订阅了指定项目的所有客户端推送事件
   * 这是各 Step Service 调用的统一方法
   */
  emitToProject(projectId: string, event: WsServerEvent['event'], data: any) {
    const message = JSON.stringify({ event, data });

    for (const [, info] of this.clients) {
      if (info.projectIds.has(projectId) && info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(message);
      }
    }
  }
}
