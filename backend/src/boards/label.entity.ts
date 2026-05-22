import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  workspace_id!: string;

  @Column()
  name!: string;

  @Column()
  color!: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;
}
