import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { Task } from './task.entity';

@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  board_id!: string;

  @Column()
  name!: string;

  @Column({ default: 1000 })
  position!: number;

  @Column({ nullable: true })
  color!: string;

  @ManyToOne(() => Board, (board) => board.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @OneToMany(() => Task, (task) => task.column, { cascade: true })
  tasks!: Task[];
}
