import { Controller, Get, Put, Post, Body, UseGuards, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.users.getProfile(userId);
  }

  @Put('profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Post('photo')
  uploadPhoto(@CurrentUser('id') userId: string, @Body('photoUrl') photoUrl: string) {
    return this.users.uploadPhoto(userId, photoUrl);
  }

  @Get('trips/history')
  getTripHistory(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.users.getTripHistory(userId, page, limit);
  }
}
