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
    // ========== 关键：先注册消息监听，缓冲认证前到达的消息 ==========
    const pendingMessages: any[] = [];
    let authenticated = false;

    client.on('message', (raw: Buffer | string) => {
      try {
        const message = JSON.parse(raw.toString());
        if (authenticated) {
          this.handleClientMessage(client, message);
        } else {
          // 认证完成前，先缓冲消息（如 subscribe）
          pendingMessages.push(message);
        }
      } catch (e) {
        this.logger.warn(`Invalid message from client: ${raw}`);
      }
    });

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

      // ========== 处理认证前缓冲的消息 ==========
      authenticated = true;
      for (const msg of pendingMessages) {
        this.logger.debug(`Processing buffered message: ${JSON.stringify(msg)}`);
        await this.handleClientMessage(client, msg);
      }
    } catch (err) {
      this.logger.warn(`WebSocket JWT 验证失败: ${(err as Error).message}`);
      client.close(4003, 'Invalid token');
      return;
    }
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
    if (!info) {
      this.logger.warn(`收到消息但客户端未认证，忽略: ${JSON.stringify(message)}`);
      return;
    }

    if (message.event === 'subscribe' && message.data?.projectId) {
      // 鉴权：校验项目归属
      const project = await this.prisma.project.findFirst({
        where: { id: message.data.projectId, userId: info.userId },
      });
      if (!project) {
        this.logger.warn(`用户 ${info.userId} 无权订阅项目 ${message.data.projectId}`);
        client.send(
          JSON.stringify({
            event: 'error',
            data: { message: '无权访问该项目' },
          }),
        );
        return;
      }
      info.projectIds.add(message.data.projectId);
      this.logger.log(`用户 ${info.userId} 已订阅项目 ${message.data.projectId}`);
    } else if (message.event === 'unsubscribe' && message.data?.projectId) {
      info.projectIds.delete(message.data.projectId);
      this.logger.log(`用户 ${info.userId} 已取消订阅项目 ${message.data.projectId}`);
    }
  }

  /**
   * 向订阅了指定项目的所有客户端推送事件
   * 这是各 Step Service 调用的统一方法
   */
  emitToProject(projectId: string, event: WsServerEvent['event'], data: any) {
    const message = JSON.stringify({ event, data });
    let sentCount = 0;

    for (const [, info] of this.clients) {
      if (info.projectIds.has(projectId) && info.ws.readyState === WebSocket.OPEN) {
        info.ws.send(message);
        sentCount++;
      }
    }

    this.logger.log(
      `emitToProject [${event}] → project ${projectId.slice(0, 8)}... ` +
      `(sent to ${sentCount}/${this.clients.size} clients)`,
    );

    if (sentCount === 0 && this.clients.size > 0) {
      // 调试：列出所有客户端订阅的项目
      for (const [, info] of this.clients) {
        this.logger.warn(
          `  Client (user ${info.userId}) subscribed to: [${[...info.projectIds].join(', ')}], ` +
          `readyState: ${info.ws.readyState}`,
        );
      }
    }
  }
}
