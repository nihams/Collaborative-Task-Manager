import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './app.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule implements OnModuleInit {
  constructor(
    private appGateway: AppGateway,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Wire gateway into notifications service after both are created
    this.notificationsService.setGateway(this.appGateway);
  }
}
