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
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/trips' })
export class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();
  private passengerLocations = new Map<string, { lat: number; lng: number }>();
  private lastDbSave = new Map<string, number>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private notifs: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
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
      this.passengerLocations.delete(client.data.userId);
      this.lastDbSave.delete(client.data.userId);
    }
  }

  // ─── driver streams location in real time ────────────────────────────────
  @SubscribeMessage('driver:location-update')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; heading?: number },
  ) {
    const userId = client.data.userId;

    // Save to DB at most every 10 seconds to reduce write load
    const now = Date.now();
    if (now - (this.lastDbSave.get(userId) ?? 0) >= 10000) {
      await this.prisma.driver.update({
        where: { userId },
        data: { currentLat: data.lat, currentLng: data.lng },
      });
      this.lastDbSave.set(userId, now);
    }

    // Broadcast live location to ALL passengers watching the public map
    const driver = await this.prisma.driver.findUnique({ where: { userId }, select: { id: true, isOnline: true } });
    if (driver?.isOnline) {
      this.server.to('public:drivers').emit('public:driver-location', {
        driverId: driver.id,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading ?? -1,
      });
    }

    const activeTrip = await this.prisma.trip.findFirst({
      where: {
        driver: { userId },
        status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      },
    });

    if (!activeTrip) return;

    // ETA target: passenger pickup for ACCEPTED/DRIVER_ARRIVED, destination for IN_PROGRESS
    let targetLat: number;
    let targetLng: number;

    if (activeTrip.status === 'IN_PROGRESS') {
      targetLat = activeTrip.dropoffLat;
      targetLng = activeTrip.dropoffLng;
    } else {
      const paxLoc = this.passengerLocations.get(activeTrip.passengerId);
      targetLat = paxLoc?.lat ?? activeTrip.pickupLat;
      targetLng = paxLoc?.lng ?? activeTrip.pickupLng;
    }

    const distanceKm = this.haversine(data.lat, data.lng, targetLat, targetLng);

    this.server.to(`user:${activeTrip.passengerId}`).emit('server:driver-location', {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? -1,
      driverId: userId,
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes: this.calcEta(distanceKm),
      status: activeTrip.status,
    });
  }

  // ─── passenger shares location every 10 s ────────────────────────────────
  @SubscribeMessage('passenger:location-update')
  async handlePassengerLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    const userId = client.data.userId;
    this.passengerLocations.set(userId, { lat: data.lat, lng: data.lng });

    const activeTrip = await this.prisma.trip.findFirst({
      where: {
        passengerId: userId,
        status: { in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      },
      include: { driver: true },
    });

    if (!activeTrip?.driver) return;

    const driverLat = activeTrip.driver.currentLat ?? data.lat;
    const driverLng = activeTrip.driver.currentLng ?? data.lng;
    const distanceKm = this.haversine(driverLat, driverLng, data.lat, data.lng);

    this.server.to(`user:${activeTrip.driver.userId}`).emit('server:passenger-location', {
      lat: data.lat,
      lng: data.lng,
      passengerId: userId,
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes: this.calcEta(distanceKm),
    });
  }

  // ─── passenger joins public room to receive live driver locations ────────
  @SubscribeMessage('join:public-drivers')
  handleJoinPublic(@ConnectedSocket() client: Socket) {
    client.join('public:drivers');
  }

  // ─── passenger broadcasts trip request to nearby drivers ─────────────────
  @SubscribeMessage('passenger:trip-request')
  async handleTripRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: {
        passenger: { select: { name: true, phone: true, profilePhoto: true } },
      },
    });

    if (!trip) return;

    const nearbyDrivers = await this.prisma.driver.findMany({
      where: { isOnline: true, status: 'APPROVED' },
      select: { userId: true },
    });

    const driverUserIds = nearbyDrivers.map((d) => d.userId);

    nearbyDrivers.forEach((driver) => {
      this.server.to(`user:${driver.userId}`).emit('server:new-trip-request', {
        trip,
        passenger: trip.passenger,
      });
    });

    // Push to offline drivers
    this.notifs.sendPushToMany(driverUserIds, {
      title: '🚖 New Trip Request',
      body: `${trip.passenger.name || 'Passenger'} needs a ride · ${trip.fareEstimate} SAR`,
      data: { tripId: trip.id, type: 'TRIP_REQUEST' },
    });
  }

  // ─── driver accepted trip → notify passenger ──────────────────────────────
  @SubscribeMessage('driver:trip-accepted')
  async handleTripAccepted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: {
        driver: {
          include: {
            user: { select: { name: true, phone: true, profilePhoto: true } },
          },
        },
      },
    });

    if (!trip) return;

    this.server.to(`user:${trip.passengerId}`).emit('server:driver-found', {
      driver: trip.driver,
      tripId: trip.id,
    });

    // Push to passenger in case they backgrounded the app
    this.notifs.sendPush(trip.passengerId, {
      title: '🚗 Driver Found!',
      body: `${trip.driver?.user?.name || 'Your driver'} is on the way`,
      data: { tripId: trip.id, type: 'TRIP_ACCEPTED' },
    });
    this.notifs.saveInApp(trip.passengerId, 'Driver Found!',
      `${trip.driver?.user?.name || 'Your driver'} accepted your trip`, 'TRIP_ACCEPTED');
  }

  // ─── driver completed trip → notify passenger ─────────────────────────────
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

    this.notifs.sendPush(trip.passengerId, {
      title: '✅ Trip Completed',
      body: `Your fare: ${trip.finalFare ?? trip.fareEstimate} SAR. Rate your driver!`,
      data: { tripId: trip.id, type: 'TRIP_COMPLETED' },
    });
    this.notifs.saveInApp(trip.passengerId, 'Trip Completed',
      `Fare: ${trip.finalFare ?? trip.fareEstimate} SAR`, 'TRIP_COMPLETED');
  }

  // ─── passenger cancelled trip → notify driver ─────────────────────────────
  @SubscribeMessage('passenger:cancel-trip')
  async handleCancelTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip || !trip.driverId) return;

    const driver = await this.prisma.driver.findUnique({ where: { id: trip.driverId } });
    if (driver) {
      this.server.to(`user:${driver.userId}`).emit('server:trip-cancelled', {
        tripId: data.tripId,
      });
      this.notifs.sendPush(driver.userId, {
        title: '❌ Trip Cancelled',
        body: 'The passenger cancelled the trip',
        data: { tripId: data.tripId, type: 'TRIP_CANCELLED' },
      });
    }
  }

  // ─── in-app chat between passenger and driver ─────────────────────────────
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string; text: string },
  ) {
    const senderId = client.data.userId;
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: { driver: true },
    });
    if (!trip) return;

    const targetUserId =
      senderId === trip.passengerId ? trip.driver?.userId : trip.passengerId;
    if (!targetUserId) return;

    const payload = {
      text: data.text,
      senderId,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`user:${targetUserId}`).emit('server:chat-message', { ...payload, isMine: false });
    client.emit('server:chat-message', { ...payload, isMine: true });
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── helpers ──────────────────────────────────────────────────────────────
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 30 km/h average city speed
  private calcEta(distanceKm: number): number {
    return Math.max(1, Math.ceil((distanceKm / 30) * 60));
  }
}
