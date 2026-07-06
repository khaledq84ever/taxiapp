import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  // Lightweight liveness probe for the uptime monitor (webcheck). Not rate
  // limited so monitoring pings never trip the throttler.
  @SkipThrottle()
  @Get('health')
  getHealth() {
    return { ok: true, ts: Date.now(), uptime_s: Math.round(process.uptime()) };
  }

  @Get()
  getRoot() {
    return {
      name: 'TaxiApp API',
      version: 'v1',
      status: 'online',
      description: 'Ride-sharing platform for Saudi Arabia',
      docs: '/api/v1',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        drivers: '/api/v1/drivers',
        trips: '/api/v1/trips',
        payments: '/api/v1/payments',
        ratings: '/api/v1/ratings',
        admin: '/api/v1/admin',
      },
      github: 'https://github.com/khaledq84ever/taxiapp',
      website: 'https://khaledq84ever.github.io/taxiapp/',
    };
  }
}
