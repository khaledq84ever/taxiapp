import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendPush(userId: string, payload: PushPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    const token = user?.fcmToken;
    if (!token || !token.startsWith('ExponentPushToken')) return;

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: 'default',
          priority: 'high',
        }),
      });
    } catch {
      // Push failures are non-fatal
    }
  }

  async sendPushToMany(userIds: string[], payload: PushPayload): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { fcmToken: true },
    });

    const tokens = users
      .map((u) => u.fcmToken)
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) return;

    // Expo supports batches of up to 100
    const batches: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      batches.push(tokens.slice(i, i + 100));
    }

    await Promise.all(
      batches.map((batch) =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(
            batch.map((to) => ({
              to,
              title: payload.title,
              body: payload.body,
              data: payload.data ?? {},
              sound: 'default',
              priority: 'high',
            })),
          ),
        }).catch(() => {}),
      ),
    );
  }

  async saveInApp(userId: string, title: string, body: string, type: string, data?: any) {
    await this.prisma.notification.create({
      data: { userId, title, body, type: type as any, data },
    });
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total, page, limit };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
