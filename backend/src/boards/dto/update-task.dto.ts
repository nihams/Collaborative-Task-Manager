import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { TaskPriority } from '../task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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
