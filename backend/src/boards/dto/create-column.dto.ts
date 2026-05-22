import {
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}
