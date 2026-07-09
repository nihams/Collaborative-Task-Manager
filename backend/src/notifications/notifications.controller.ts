import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: Request & { user: User }) {
    return this.notificationsService.findForUser(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: Request & { user: User }) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  @HttpCode(200)
  markAllAsRead(@Req() req: Request & { user: User }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @HttpCode(200)
  markAsRead(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
