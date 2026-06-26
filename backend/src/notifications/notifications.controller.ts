import { Controller, Get, Put, Query, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifs: NotificationsService) {}

  @Get()
  getAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.notifs.getForUser(userId, page);
  }

  @Get('unread-count')
  getUnread(@CurrentUser('id') userId: string) {
    return this.notifs.getUnreadCount(userId).then((count) => ({ count }));
  }

  @Put('read-all')
  markRead(@CurrentUser('id') userId: string) {
    return this.notifs.markAllRead(userId);
  }
}
