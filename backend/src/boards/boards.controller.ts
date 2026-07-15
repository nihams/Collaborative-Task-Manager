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
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // ─── Boards ───────────────────────────────────────────────

  @Post('boards')
  createBoard(
    @Body() dto: CreateBoardDto,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.createBoard(dto, req.user.id);
  }

  @Get('boards/:id')
  getBoard(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.boardsService.getBoard(id, req.user.id);
  }

  @Get('workspaces/:id/boards')
  getBoardsForWorkspace(
    @Param('id') workspaceId: string,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.getBoardsForWorkspace(workspaceId, req.user.id);
  }

  @Patch('boards/:id')
  updateBoard(
    @Param('id') id: string,
    @Body() body: { name: string },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.updateBoard(id, body.name, req.user.id);
  }

  @Delete('boards/:id')
  @HttpCode(200)
  deleteBoard(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.boardsService.deleteBoard(id, req.user.id);
  }

  // ─── Columns ──────────────────────────────────────────────

  @Post('boards/:id/columns')
  createColumn(
    @Param('id') boardId: string,
    @Body() dto: CreateColumnDto,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.createColumn(boardId, dto, req.user.id);
  }

  @Patch('columns/:id')
  updateColumn(
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.updateColumn(id, body, req.user.id);
  }

  @Delete('columns/:id')
  @HttpCode(200)
  deleteColumn(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.boardsService.deleteColumn(id, req.user.id);
  }

  @Post('boards/:id/columns/reorder')
  reorderColumns(
    @Param('id') boardId: string,
    @Body() body: { columns: { id: string; position: number }[] },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.reorderColumns(
      boardId,
      body.columns,
      req.user.id,
    );
  }

  // ─── Tasks ────────────────────────────────────────────────

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto, @Req() req: Request & { user: User }) {
    return this.boardsService.createTask(dto, req.user.id);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.boardsService.getTask(id, req.user.id);
  }

  @Patch('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.updateTask(id, dto, req.user.id);
  }

  @Delete('tasks/:id')
  @HttpCode(200)
  deleteTask(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.boardsService.deleteTask(id, req.user.id);
  }

  @Patch('tasks/:id/move')
  moveTask(
    @Param('id') id: string,
    @Body() body: { column_id: string; position: number },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.moveTask(
      id,
      body.column_id,
      body.position,
      req.user.id,
    );
  }

  // ─── Labels ───────────────────────────────────────────────

  @Post('workspaces/:id/labels')
  createLabel(
    @Param('id') workspaceId: string,
    @Body() body: { name: string; color: string },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.createLabel(
      workspaceId,
      body.name,
      body.color,
      req.user.id,
    );
  }

  @Post('tasks/:id/labels')
  addLabel(
    @Param('id') taskId: string,
    @Body() body: { label_id: string },
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.addLabelToTask(
      taskId,
      body.label_id,
      req.user.id,
    );
  }

  @Delete('tasks/:id/labels/:labelId')
  @HttpCode(200)
  removeLabel(
    @Param('id') taskId: string,
    @Param('labelId') labelId: string,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.removeLabelFromTask(taskId, labelId, req.user.id);
  }

  // ─── Workload ─────────────────────────────────────────────

  @Get('workspaces/:id/workload')
  getWorkload(
    @Param('id') workspaceId: string,
    @Req() req: Request & { user: User },
  ) {
    return this.boardsService.getWorkload(workspaceId, req.user.id);
  }
}
