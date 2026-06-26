import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), { apiVersion: '2026-06-24.dahlia' });
  }

  async createPaymentIntent(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.passengerId !== userId) throw new BadRequestException('Not your trip');
    if (trip.paymentMethod !== 'CARD') throw new BadRequestException('Trip uses cash payment');

    const amountCents = Math.round((trip.finalFare ?? trip.fareEstimate) * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'sar',
      metadata: { tripId },
    });

    await this.prisma.payment.upsert({
      where: { tripId },
      create: {
        tripId,
        amount: trip.finalFare ?? trip.fareEstimate,
        currency: 'SAR',
        method: 'CARD',
        stripePaymentId: intent.id,
        stripeClientSecret: intent.client_secret,
      },
      update: {
        stripePaymentId: intent.id,
        stripeClientSecret: intent.client_secret,
      },
    });

    return { clientSecret: intent.client_secret };
  }

  async confirmPayment(tripId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { tripId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.payment.update({
      where: { tripId },
      data: { status: 'PAID' },
    });

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { paymentStatus: 'PAID' },
    });

    return { success: true };
  }
}
