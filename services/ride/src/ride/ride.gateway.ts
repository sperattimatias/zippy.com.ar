import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { getWsCorsOptions } from './ws-cors.config';
import { MetricsService } from '../metrics/metrics.service';

type SubscribeTripPayload = {
  tripId?: string;
};

type SubscribeTripAck =
  | { ok: true; room: string }
  | {
      ok: false;
      error: {
        code: 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL';
        message: string;
      };
    };

@Injectable()
@WebSocketGateway({ namespace: '/rides', cors: getWsCorsOptions() })
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RideGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async handleConnection(client: Socket) {
    const authHeader =
      (client.handshake.headers.authorization as string | undefined) ??
      (client.handshake.auth?.token ? `Bearer ${client.handshake.auth.token}` : undefined);

    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = authHeader.slice(7);
    try {
      const user = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      (client.data as any).user = user;
      client.join(`user:${user.sub}`);
      if (Array.isArray(user.roles) && user.roles.includes('driver'))
        client.join(`driver:${user.sub}`);
      if (Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('sos')))
        client.join('sos:alerts');
      this.logger.log(`socket connected ${client.id} user=${user.sub}`);
      this.metrics?.setWsConnectedClients(this.server.of('/rides').sockets.size);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected ${client.id}`);
    this.metrics?.setWsConnectedClients(this.server.of('/rides').sockets.size);
  }

  /**
   * Subscribes an authenticated passenger/driver to realtime updates for a trip room.
   */
  @SubscribeMessage('subscribeTrip')
  async subscribeTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeTripPayload,
  ): Promise<SubscribeTripAck> {
    const tripId = typeof payload?.tripId === 'string' ? payload.tripId.trim() : '';
    const userId = (client.data as { user?: { sub?: string } })?.user?.sub;

    this.logger.log(`trip subscription attempt socket=${client.id} user=${userId ?? 'unknown'} trip=${tripId}`);

    if (!userId) {
      this.logger.warn(`trip subscription rejected socket=${client.id} reason=missing-user`);
      this.metrics?.incWsSubscribeTrip(false);
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
    }

    if (!tripId) {
      this.logger.warn(`trip subscription rejected socket=${client.id} user=${userId} reason=invalid-trip-id`);
      this.metrics?.incWsSubscribeTrip(false);
      return { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid tripId' } };
    }

    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: { id: true, passenger_user_id: true, driver_user_id: true },
      });

      if (!trip) {
        this.logger.warn(`trip subscription rejected socket=${client.id} user=${userId} trip=${tripId} reason=not-found`);
        this.metrics?.incWsSubscribeTrip(false);
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } };
      }

      const isAuthorized =
        trip.passenger_user_id === userId || (trip.driver_user_id && trip.driver_user_id === userId);

      if (!isAuthorized) {
        this.logger.warn(`trip subscription rejected socket=${client.id} user=${userId} trip=${tripId}`);
        this.metrics?.incWsSubscribeTrip(false);
        return { ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden trip subscription' } };
      }

      const room = `trip:${tripId}`;
      await client.join(room);
      this.logger.log(`trip subscription success socket=${client.id} user=${userId} room=${room}`);
      this.metrics?.incWsSubscribeTrip(true);
      return { ok: true, room };
    } catch (error) {
      this.logger.error(
        `trip subscription failed socket=${client.id} user=${userId} trip=${tripId} err=${(error as Error).message}`,
      );
      this.metrics?.incWsSubscribeTrip(false);
      return { ok: false, error: { code: 'INTERNAL', message: 'Subscription failed' } };
    }
  }

  /**
   * Emits a realtime event to all clients currently subscribed to a trip room.
   */
  emitTrip(tripId: string, event: string, payload: unknown) {
    this.server.to(`trip:${tripId}`).emit(event, payload);
  }
  emitToDriver(driverUserId: string, event: string, payload: unknown) {
    this.server.to(`driver:${driverUserId}`).emit(event, payload);
  }
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
  emitSosAlert(event: string, payload: unknown) {
    this.server.to('sos:alerts').emit(event, payload);
  }
}
