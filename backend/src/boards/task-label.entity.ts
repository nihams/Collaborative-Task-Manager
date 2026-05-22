import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Label } from './label.entity';

@Entity('task_labels')
export class TaskLabel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  task_id!: string;

  @Column()
  label_id!: string;

  @ManyToOne(() => Task, (task) => task.taskLabels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => Label, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'label_id' })
  label!: Label;
}
