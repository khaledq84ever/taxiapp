import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PromosService } from './promos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('promos')
@UseGuards(JwtAuthGuard)
export class PromosController {
  constructor(private service: PromosService) {}

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.service.validate(code);
  }

  @Get('list')
  list() {
    return [
      { code: 'WELCOME50', label: '50% off — new user welcome!', discountPct: 50 },
      { code: 'FIRST30',   label: '30% off your first ride',     discountPct: 30 },
      { code: 'TAXIAPP20', label: '20% off — app launch',        discountPct: 20 },
      { code: 'RAMADAN25', label: '25% off during Ramadan',       discountPct: 25 },
    ];
  }
}
