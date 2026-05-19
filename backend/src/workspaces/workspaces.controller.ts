import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { WorkspaceRole } from './workspace-member.entity';
import { User } from '../users/user.entity';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: Request & { user: User },
  ) {
    return this.workspacesService.create(dto, req.user.id);
  }

  @Get('mine')
  findMine(@Req() req: Request & { user: User }) {
    return this.workspacesService.findAllForUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @Req() req: Request & { user: User },
  ) {
    return this.workspacesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.workspacesService.remove(id, req.user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { email: string; role: WorkspaceRole },
    @Req() req: Request & { user: User },
  ) {
    return this.workspacesService.addMember(
      id,
      body.email,
      body.role,
      req.user.id,
    );
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: WorkspaceRole },
    @Req() req: Request & { user: User },
  ) {
    return this.workspacesService.updateMemberRole(
      id,
      userId,
      body.role,
      req.user.id,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(200)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: Request & { user: User },
  ) {
    return this.workspacesService.removeMember(id, userId, req.user.id);
  }
}
