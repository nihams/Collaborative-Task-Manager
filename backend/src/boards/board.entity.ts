import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Workspace } from '../workspaces/workspace.entity';
import { User } from '../users/user.entity';
import { BoardColumn } from './board-column.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  workspace_id!: string;

  @Column()
  name!: string;

  @Column()
  created_by!: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @OneToMany(() => BoardColumn, (column) => column.board, {
    cascade: true,
  })
  columns!: BoardColumn[];

  @CreateDateColumn()
  created_at!: Date;
}
