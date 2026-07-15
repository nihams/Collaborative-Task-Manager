import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BoardsService } from '../boards/boards.service';
import { WorkspaceRole } from '../workspaces/workspace-member.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditEntityType } from '../audit-log/audit-log.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    private workspacesService: WorkspacesService,
    private boardsService: BoardsService,
    private auditLogService: AuditLogService,
  ) {}

  async create(taskId: string, dto: CreateCommentDto, userId: string) {
    const task = await this.boardsService.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    const member = await this.workspacesService.getMemberRole(
      task.workspace_id,
      userId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    const comment = this.commentRepo.create({
      task_id: taskId,
      user_id: userId,
      content: dto.content,
    });

    return this.commentRepo.save(comment);
  }

  async findAllForTask(taskId: string, userId: string) {
    const task = await this.boardsService.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    const member = await this.workspacesService.getMemberRole(
      task.workspace_id,
      userId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    return this.commentRepo.find({
      where: { task_id: taskId },
      relations: ['author'],
      order: { created_at: 'ASC' },
    });
  }

  async update(commentId: string, content: string, userId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    await this.commentRepo.update(commentId, { content });
    return this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['author'],
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['task'],
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const member = await this.workspacesService.getMemberRole(
      comment.task.workspace_id,
      userId,
    );

    const isAuthor = comment.user_id === userId;
    const isAdminOrOwner =
      member?.role === WorkspaceRole.ADMIN ||
      member?.role === WorkspaceRole.OWNER;

    if (!isAuthor && !isAdminOrOwner) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.delete(commentId);

    await this.auditLogService.log({
      workspace_id: comment.task.workspace_id,
      actor_id: userId,
      action: AuditAction.COMMENT_DELETED,
      entity_type: AuditEntityType.COMMENT,
      entity_id: commentId,
      metadata: { task_id: comment.task_id },
    });

    return { message: 'Comment deleted' };
  }
}
