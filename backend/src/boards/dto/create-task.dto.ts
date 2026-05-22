import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskPriority } from '../task.entity';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsUUID()
  column_id!: string;

  @IsUUID()
  board_id!: string;

  @IsUUID()
  workspace_id!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;
}
