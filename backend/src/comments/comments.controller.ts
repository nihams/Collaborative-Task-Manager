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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.commentsService.create(taskId, dto, req.user.id);
  }

  @Get('tasks/:taskId/comments')
  findAll(
    @Param('taskId') taskId: string,
    @Req() req: Request & { user: User },
  ) {
    return this.commentsService.findAllForTask(taskId, req.user.id);
  }

  @Patch('comments/:id')
  update(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: Request & { user: User },
  ) {
    return this.commentsService.update(id, body.content, req.user.id);
  }

  @Delete('comments/:id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return this.commentsService.remove(id, req.user.id);
  }
}
