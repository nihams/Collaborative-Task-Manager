import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { Board } from './board.entity';
import { BoardColumn } from './board-column.entity';
import { Task } from './task.entity';
import { Label } from './label.entity';
import { TaskLabel } from './task-label.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, BoardColumn, Task, Label, TaskLabel]),
    WorkspacesModule,
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
