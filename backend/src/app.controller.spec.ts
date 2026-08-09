import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should report health', () => {
      const health = appController.getHealth();
      expect(health.ok).toBe(true);
      expect(health.ts).toEqual(expect.any(Number));
      expect(health.uptime_s).toEqual(expect.any(Number));
    });

    it('should describe the API', () => {
      const root = appController.getRoot();
      expect(root.name).toBe('TaxiApp API');
      expect(root.status).toBe('online');
      expect(root.endpoints.auth).toBe('/api/v1/auth');
    });
  });
});
