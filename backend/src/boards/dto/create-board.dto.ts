import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @IsUUID()
  workspace_id!: string;
}
