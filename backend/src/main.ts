import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
        auth: '/api/v1/auth/send-otp',
        drivers: '/api/v1/drivers/nearby',
        trips: '/api/v1/trips/estimate',
        admin: '/api/v1/admin/stats',
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
