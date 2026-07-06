import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Behind Railway's proxy, X-Forwarded-For is "<real client>, <edge>" and the
  // edge IP ROTATES every request. `trust proxy: 1` keyed the rate limiter on
  // that rotating edge (so it never accumulated); `true` makes req.ip the
  // leftmost/real client, which is stable per user.
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.enableCors({ origin: '*' });

  // Root welcome endpoint (before global prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: any, res: any) => {
    res.json({
      name: 'TaxiApp API',
      version: 'v1',
      status: 'online',
      description: 'Ride-sharing platform for Saudi Arabia 🇸🇦',
      base_url: '/api/v1',
      endpoints: {
        auth: '/api/v1/auth/guest',
        drivers: '/api/v1/drivers/nearby',
        trips: '/api/v1/trips/estimate',
        health: '/api/v1/health',
      },
      github: 'https://github.com/khaledq84ever/taxiapp',
      website: 'https://khaledq84ever.github.io/taxiapp/',
    });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`TaxiApp backend running on port ${port}`);
}
bootstrap();
