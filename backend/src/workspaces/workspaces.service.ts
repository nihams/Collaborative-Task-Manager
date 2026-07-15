import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceMember, WorkspaceRole } from './workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditEntityType } from '../audit-log/audit-log.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private memberRepo: Repository<WorkspaceMember>,
    private usersService: UsersService,
    private auditLogService: AuditLogService,
  ) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') +
      '-' +
      Date.now()
    );
  }

  async create(dto: CreateWorkspaceDto, userId: string) {
    const slug = this.generateSlug(dto.name);

    const workspace = this.workspaceRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      created_by: userId,
    });

    const saved = await this.workspaceRepo.save(workspace);

    await this.memberRepo.save({
      workspace_id: saved.id,
      user_id: userId,
      role: WorkspaceRole.OWNER,
    });

    return saved;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { user_id: userId },
      relations: ['workspace'],
    });
    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  async findOne(workspaceId: string, userId: string) {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      relations: ['members', 'members.user'],
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const member = await this.memberRepo.findOne({
      where: { workspace_id: workspaceId, user_id: userId },
    });

    if (!member) throw new ForbiddenException('You are not a member');

    return workspace;
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto, userId: string) {
    await this.requireRole(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    await this.workspaceRepo.update(workspaceId, dto);
    return this.workspaceRepo.findOne({ where: { id: workspaceId } });
  }

  async remove(workspaceId: string, userId: string) {
    await this.requireRole(workspaceId, userId, [WorkspaceRole.OWNER]);
    await this.workspaceRepo.delete(workspaceId);
    return { message: 'Workspace deleted' };
  }

  async addMember(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    requestingUserId: string,
  ) {
    await this.requireRole(workspaceId, requestingUserId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.memberRepo.findOne({
      where: { workspace_id: workspaceId, user_id: user.id },
    });
    if (existing) throw new ConflictException('User is already a member');

    const saved = await this.memberRepo.save({
      workspace_id: workspaceId,
      user_id: user.id,
      role,
    });
    await this.auditLogService.log({
      workspace_id: workspaceId,
      actor_id: requestingUserId,
      action: AuditAction.MEMBER_ADDED,
      entity_type: AuditEntityType.MEMBER,
      entity_id: user.id,
      metadata: { email, role },
    });
    return saved;
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole,
    requestingUserId: string,
  ) {
    await this.requireRole(workspaceId, requestingUserId, [
      WorkspaceRole.OWNER,
    ]);

    await this.memberRepo.update(
      { workspace_id: workspaceId, user_id: targetUserId },
      { role },
    );

    await this.auditLogService.log({
      workspace_id: workspaceId,
      actor_id: requestingUserId,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      entity_type: AuditEntityType.MEMBER,
      entity_id: targetUserId,
      metadata: { newRole: role },
    });
    return { message: 'Role updated' };
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requestingUserId: string,
  ) {
    await this.requireRole(workspaceId, requestingUserId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    await this.memberRepo.delete({
      workspace_id: workspaceId,
      user_id: targetUserId,
    });

    await this.auditLogService.log({
      workspace_id: workspaceId,
      actor_id: requestingUserId,
      action: AuditAction.MEMBER_REMOVED,
      entity_type: AuditEntityType.MEMBER,
      entity_id: targetUserId,
      metadata: {},
    });
    return { message: 'Member removed' };
  }

  async getMemberRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.memberRepo.findOne({
      where: { workspace_id: workspaceId, user_id: userId },
    });
  }

  private async requireRole(
    workspaceId: string,
    userId: string,
    roles: WorkspaceRole[],
  ) {
    const member = await this.memberRepo.findOne({
      where: { workspace_id: workspaceId, user_id: userId },
    });

    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return member;
  }
}
