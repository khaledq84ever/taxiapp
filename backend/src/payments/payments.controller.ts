import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create-intent')
  createIntent(@CurrentUser('id') userId: string, @Body('tripId') tripId: string) {
    return this.payments.createPaymentIntent(tripId, userId);
  }

  @Post('confirm')
  confirm(@CurrentUser('id') userId: string, @Body('tripId') tripId: string) {
    return this.payments.confirmPayment(tripId, userId);
  }
}
