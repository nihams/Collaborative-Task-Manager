import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationType } from './notifications.entity';

export interface CreateNotificationDto {
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private gateway: any;

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDeadlineNotifications() {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create(dto);
    const saved = await this.notificationRepo.save(notification);
    if (this.gateway) {
      this.gateway.sendNotificationToUser(dto.recipient_id, saved);
    }
    return saved;
  }

  async findForUser(userId: string) {
    return this.notificationRepo.find({
      where: { recipient_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { recipient_id: userId, read: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationRepo.update(
      { id: notificationId, recipient_id: userId },
      { read: true },
    );
    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      { recipient_id: userId, read: false },
      { read: true },
    );
    return { message: 'All marked as read' };
  }
}
