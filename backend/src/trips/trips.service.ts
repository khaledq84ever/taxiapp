import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestTripDto, EstimateFareDto } from './dto/request-trip.dto';

const BASE_FARE = 5;
const PER_KM_RATE = 2.5;
const PLATFORM_COMMISSION = 0.2;

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private notifs: NotificationsService,
  ) {}

  estimateFare(dto: EstimateFareDto) {
    const distanceKm = this.haversine(dto.pickupLat, dto.pickupLng, dto.dropoffLat, dto.dropoffLng);
    const fare = BASE_FARE + distanceKm * PER_KM_RATE;
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedFare: Math.round(fare * 100) / 100,
      currency: 'SAR',
    };
  }

  async requestTrip(passengerId: string, dto: RequestTripDto) {
    const estimate = this.estimateFare(dto);

    const activeTrip = await this.prisma.trip.findFirst({
      where: { passengerId, status: { in: ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
    });
    if (activeTrip) throw new BadRequestException('You already have an active trip');

    return this.prisma.trip.create({
      data: {
        passengerId,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        fareEstimate: estimate.estimatedFare,
        distanceKm: estimate.distanceKm,
        paymentMethod: dto.paymentMethod,
      },
      include: { passenger: { select: { name: true, phone: true, profilePhoto: true } } },
    });
  }

  async getActiveTrip(userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        status: { in: ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
        OR: [
          { passengerId: userId },
          { driver: { userId } },
        ],
      },
      include: {
        passenger: { select: { name: true, phone: true, profilePhoto: true } },
        driver: { include: { user: { select: { name: true, phone: true, profilePhoto: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return trip ?? null;
  }

  async getTrip(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        passenger: { select: { name: true, phone: true, profilePhoto: true } },
        driver: { include: { user: { select: { name: true, phone: true, profilePhoto: true } } } },
        payment: true,
        ratings: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async acceptTrip(tripId: string, userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException('Not a driver');

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== 'REQUESTED') throw new BadRequestException('Trip not available');

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { driverId: driver.id, status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async markArrived(tripId: string, userId: string) {
    const trip = await this.updateTripStatus(tripId, userId, 'ACCEPTED', 'DRIVER_ARRIVED', { arrivedAt: new Date() });
    this.notifs.sendPush(trip.passengerId, {
      title: '🚗 Driver Arrived!',
      body: 'Your driver is waiting at the pickup point',
      data: { tripId: trip.id, type: 'DRIVER_ARRIVED' },
    });
    this.notifs.saveInApp(trip.passengerId, 'Driver Arrived!', 'Your driver is at the pickup point', 'DRIVER_ARRIVED');
    return trip;
  }

  async startTrip(tripId: string, userId: string) {
    const trip = await this.updateTripStatus(tripId, userId, 'DRIVER_ARRIVED', 'IN_PROGRESS', { startedAt: new Date() });
    this.notifs.sendPush(trip.passengerId, {
      title: '🚀 Trip Started',
      body: 'Your trip is now in progress. Enjoy the ride!',
      data: { tripId: trip.id, type: 'TRIP_STARTED' },
    });
    this.notifs.saveInApp(trip.passengerId, 'Trip Started', 'Your ride is in progress', 'TRIP_STARTED');
    return trip;
  }

  async completeTrip(tripId: string, userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== 'IN_PROGRESS') throw new BadRequestException('Trip not in progress');
    if (trip.driverId !== driver?.id) throw new ForbiddenException();

    const finalFare = trip.fareEstimate;
    const driverEarnings = finalFare * (1 - PLATFORM_COMMISSION);

    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { totalTrips: { increment: 1 }, totalEarnings: { increment: driverEarnings } },
    });

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'COMPLETED', completedAt: new Date(), finalFare },
    });
  }

  async cancelTrip(tripId: string, userId: string, reason?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!['REQUESTED', 'ACCEPTED'].includes(trip.status)) {
      throw new BadRequestException('Trip cannot be cancelled at this stage');
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED', cancelledBy: userId, cancelReason: reason },
    });
  }

  private async updateTripStatus(tripId: string, userId: string, fromStatus: string, toStatus: any, extra: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== fromStatus) throw new BadRequestException(`Trip must be in ${fromStatus} status`);
    if (trip.driverId !== driver?.id) throw new ForbiddenException();
    return this.prisma.trip.update({ where: { id: tripId }, data: { status: toStatus, ...extra } });
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
