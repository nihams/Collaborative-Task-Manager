import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './board.entity';
import { BoardColumn } from './board-column.entity';
import { Task } from './task.entity';
import { Label } from './label.entity';
import { TaskLabel } from './task-label.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceRole } from '../workspaces/workspace-member.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private boardRepo: Repository<Board>,
    @InjectRepository(BoardColumn)
    private columnRepo: Repository<BoardColumn>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Label)
    private labelRepo: Repository<Label>,
    @InjectRepository(TaskLabel)
    private taskLabelRepo: Repository<TaskLabel>,
    private workspacesService: WorkspacesService,
  ) {}

  // ─── Boards ───────────────────────────────────────────────

  async createBoard(dto: CreateBoardDto, userId: string) {
    await this.requireWorkspaceMember(dto.workspace_id, userId);

    const board = this.boardRepo.create({
      name: dto.name,
      workspace_id: dto.workspace_id,
      created_by: userId,
    });

    const saved = await this.boardRepo.save(board);

    // Create default columns automatically
    await this.columnRepo.save([
      { board_id: saved.id, name: 'To Do', position: 1000 },
      { board_id: saved.id, name: 'In Progress', position: 2000 },
      { board_id: saved.id, name: 'In Review', position: 3000 },
      { board_id: saved.id, name: 'Done', position: 4000 },
    ]);

    return this.getBoard(saved.id, userId);
  }

  async getBoard(boardId: string, userId: string) {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      relations: ['columns', 'columns.tasks', 'columns.tasks.assignee'],
    });

    if (!board) throw new NotFoundException('Board not found');

    await this.requireWorkspaceMember(board.workspace_id, userId);

    board.columns.sort((a, b) => a.position - b.position);
    board.columns.forEach((col) => {
      col.tasks.sort((a, b) => a.position - b.position);
    });

    return board;
  }

  async updateBoard(boardId: string, name: string, userId: string) {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');

    await this.requireRole(board.workspace_id, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    await this.boardRepo.update(boardId, { name });
    return this.boardRepo.findOne({ where: { id: boardId } });
  }

  async deleteBoard(boardId: string, userId: string) {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');

    await this.requireRole(board.workspace_id, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    await this.boardRepo.delete(boardId);
    return { message: 'Board deleted' };
  }

  // ─── Columns ──────────────────────────────────────────────

  async createColumn(boardId: string, dto: CreateColumnDto, userId: string) {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');

    await this.requireWorkspaceMember(board.workspace_id, userId);

    const lastColumn = await this.columnRepo.findOne({
      where: { board_id: boardId },
      order: { position: 'DESC' },
    });

    const position = lastColumn ? lastColumn.position + 1000 : 1000;

    return this.columnRepo.save({
      board_id: boardId,
      name: dto.name,
      color: dto.color,
      position,
    });
  }

  async updateColumn(
    columnId: string,
    data: { name?: string; color?: string },
    userId: string,
  ) {
    const column = await this.columnRepo.findOne({
      where: { id: columnId },
      relations: ['board'],
    });
    if (!column) throw new NotFoundException('Column not found');

    await this.requireWorkspaceMember(column.board.workspace_id, userId);
    await this.columnRepo.update(columnId, data);
    return this.columnRepo.findOne({ where: { id: columnId } });
  }

  async deleteColumn(columnId: string, userId: string) {
    const column = await this.columnRepo.findOne({
      where: { id: columnId },
      relations: ['board'],
    });
    if (!column) throw new NotFoundException('Column not found');

    await this.requireWorkspaceMember(column.board.workspace_id, userId);
    await this.columnRepo.delete(columnId);
    return { message: 'Column deleted' };
  }

  async reorderColumns(
    boardId: string,
    columns: { id: string; position: number }[],
    userId: string,
  ) {
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');

    await this.requireWorkspaceMember(board.workspace_id, userId);

    await Promise.all(
      columns.map((col) =>
        this.columnRepo.update(col.id, { position: col.position }),
      ),
    );

    return { message: 'Columns reordered' };
  }

  // ─── Tasks ────────────────────────────────────────────────

  async createTask(dto: CreateTaskDto, userId: string) {
    await this.requireWorkspaceMember(dto.workspace_id, userId);

    const lastTask = await this.taskRepo.findOne({
      where: { column_id: dto.column_id },
      order: { position: 'DESC' },
      withDeleted: false,
    });

    const position = lastTask ? lastTask.position + 1000 : 1000;

    const task = this.taskRepo.create({
      ...dto,
      created_by: userId,
      position,
    });

    return this.taskRepo.save(task);
  }

  async getTask(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['assignee', 'creator', 'taskLabels', 'taskLabels.label'],
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.requireWorkspaceMember(task.workspace_id, userId);
    return task;
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.requireWorkspaceMember(task.workspace_id, userId);
    await this.taskRepo.update(taskId, dto);
    return this.getTask(taskId, userId);
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.requireWorkspaceMember(task.workspace_id, userId);
    await this.taskRepo.softDelete(taskId);
    return { message: 'Task deleted' };
  }

  async moveTask(
    taskId: string,
    columnId: string,
    position: number,
    userId: string,
  ) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.requireWorkspaceMember(task.workspace_id, userId);

    await this.taskRepo.update(taskId, {
      column_id: columnId,
      position,
    });

    return this.getTask(taskId, userId);
  }

  // ─── Labels ───────────────────────────────────────────────

  async createLabel(
    workspaceId: string,
    name: string,
    color: string,
    userId: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId);
    return this.labelRepo.save({ workspace_id: workspaceId, name, color });
  }

  async addLabelToTask(taskId: string, labelId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.requireWorkspaceMember(task.workspace_id, userId);
    return this.taskLabelRepo.save({ task_id: taskId, label_id: labelId });
  }

  async removeLabelFromTask(taskId: string, labelId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.requireWorkspaceMember(task.workspace_id, userId);
    await this.taskLabelRepo.delete({ task_id: taskId, label_id: labelId });
    return { message: 'Label removed' };
  }

  // ─── Workload ─────────────────────────────────────────────

  async getWorkload(workspaceId: string, userId: string) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const result = await this.taskRepo
      .createQueryBuilder('task')
      .select('task.assigned_to', 'userId')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('task.workspace_id = :workspaceId', { workspaceId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.assigned_to')
      .getRawMany();

    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async requireWorkspaceMember(workspaceId: string, userId: string) {
    const member = await this.workspacesService.getMemberRole(
      workspaceId,
      userId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');
    return member;
  }

  private async requireRole(
    workspaceId: string,
    userId: string,
    roles: WorkspaceRole[],
  ) {
    const member = await this.requireWorkspaceMember(workspaceId, userId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return member;
  }
}
