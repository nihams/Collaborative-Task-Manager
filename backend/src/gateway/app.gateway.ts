import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private redis: Redis;

  // maps socketId → userId for cleanup on disconnect
  private socketUserMap = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: +this.configService.get('REDIS_PORT', '6379'),
    });
  }

  // ─── Connection lifecycle ──────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      this.socketUserMap.set(client.id, payload.sub);

      // Join a personal room for receiving notifications
      client.join(`user:${payload.sub}`);

      console.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUserMap.get(client.id);
    if (!userId) return;

    this.socketUserMap.delete(client.id);

    // Clean up all board presences for this socket
    const boardKeys = await this.redis.keys(`presence:board:*`);
    for (const key of boardKeys) {
      await this.redis.srem(key, userId);
      const boardId = key.replace('presence:board:', '');
      const members = await this.getPresenceMembers(boardId);
      this.server.to(`board:${boardId}`).emit('presence-update', members);
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  // ─── Board presence ───────────────────────────────────────

  @SubscribeMessage('join-board')
  async handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { boardId } = data;

    // Join the Socket.io room for this board
    client.join(`board:${boardId}`);

    // Store presence in Redis with 60 second TTL
    await this.redis.sadd(`presence:board:${boardId}`, userId);
    await this.redis.expire(`presence:board:${boardId}`, 60);

    // Broadcast updated presence to everyone in the board room
    const members = await this.getPresenceMembers(boardId);
    this.server.to(`board:${boardId}`).emit('presence-update', members);
  }

  @SubscribeMessage('leave-board')
  async handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { boardId } = data;

    client.leave(`board:${boardId}`);

    await this.redis.srem(`presence:board:${boardId}`, userId);

    const members = await this.getPresenceMembers(boardId);
    this.server.to(`board:${boardId}`).emit('presence-update', members);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.boardId) return;

    // Renew the TTL so presence doesn't expire while user is active
    await this.redis.expire(`presence:board:${data.boardId}`, 60);
  }

  // ─── Real time notifications ──────────────────────────────

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async getPresenceMembers(boardId: string): Promise<string[]> {
    const members = await this.redis.smembers(`presence:board:${boardId}`);
    return members;
  }
}
