import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Workspace } from '../workspaces/workspace.entity';

export enum AuditAction {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_MOVED = 'TASK_MOVED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DELETED = 'TASK_DELETED',
  COLUMN_CREATED = 'COLUMN_CREATED',
  COLUMN_DELETED = 'COLUMN_DELETED',
  BOARD_CREATED = 'BOARD_CREATED',
  BOARD_DELETED = 'BOARD_DELETED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  MEMBER_ROLE_CHANGED = 'MEMBER_ROLE_CHANGED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}

export enum AuditEntityType {
  TASK = 'TASK',
  COLUMN = 'COLUMN',
  BOARD = 'BOARD',
  MEMBER = 'MEMBER',
  COMMENT = 'COMMENT',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  workspace_id!: string;

  @Column({ nullable: true })
  actor_id!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entity_type!: AuditEntityType;

  @Column()
  entity_id!: string;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: User;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @CreateDateColumn()
  created_at!: Date;
}
