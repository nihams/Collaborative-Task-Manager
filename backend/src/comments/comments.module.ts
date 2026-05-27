import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './comment.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    WorkspacesModule,
    BoardsModule,
  ],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
