import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { AuditEntityType } from './audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { User } from '../users/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get('workspaces/:workspaceId/audit-log')
  async getWorkspaceLog(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: Request & { user: User },
  ) {
    const member = await this.workspacesService.getMemberRole(
      workspaceId,
      req.user.id,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    return this.auditLogService.findForWorkspace(
      workspaceId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('audit-log/:entityType/:entityId')
  async getEntityLog(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findForEntity(entityId, entityType);
  }
}
