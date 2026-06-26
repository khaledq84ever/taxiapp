import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/trips' })
export class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      this.connectedUsers.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
    }
  }

  @SubscribeMessage('driver:location-update')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    const userId = client.data.userId;
    await this.prisma.driver.update({
      where: { userId },
      data: { currentLat: data.lat, currentLng: data.lng },
    });

    const activeTrip = await this.prisma.trip.findFirst({
      where: { driver: { userId }, status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
    });

    if (activeTrip) {
      this.server.to(`user:${activeTrip.passengerId}`).emit('server:driver-location', {
        lat: data.lat,
        lng: data.lng,
        driverId: userId,
      });
    }
  }

  @SubscribeMessage('passenger:trip-request')
  async handleTripRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: { passenger: { select: { name: true, phone: true, profilePhoto: true } } },
    });

    if (!trip) return;

    const nearbyDrivers = await this.prisma.driver.findMany({
      where: { isOnline: true, status: 'APPROVED' },
      select: { userId: true },
    });

    nearbyDrivers.forEach((driver) => {
      this.server.to(`user:${driver.userId}`).emit('server:new-trip-request', {
        trip,
        passenger: trip.passenger,
      });
    });
  }

  @SubscribeMessage('driver:trip-accepted')
  async handleTripAccepted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: { driver: { include: { user: { select: { name: true, phone: true, profilePhoto: true } } } } },
    });

    if (!trip) return;

    this.server.to(`user:${trip.passengerId}`).emit('server:driver-found', {
      driver: trip.driver,
      tripId: trip.id,
    });
  }

  @SubscribeMessage('driver:trip-completed')
  async handleTripCompleted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) return;

    this.server.to(`user:${trip.passengerId}`).emit('server:trip-update', {
      status: 'COMPLETED',
      finalFare: trip.finalFare,
      tripId: trip.id,
    });
  }

  @SubscribeMessage('passenger:cancel-trip')
  async handleCancelTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip || !trip.driverId) return;

    const driver = await this.prisma.driver.findUnique({ where: { id: trip.driverId } });
    if (driver) {
      this.server.to(`user:${driver.userId}`).emit('server:trip-cancelled', { tripId: data.tripId });
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
