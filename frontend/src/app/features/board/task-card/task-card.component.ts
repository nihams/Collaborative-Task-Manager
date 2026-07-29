import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority, Label } from '../../../core/models';
import { avatarColor } from '../../../core/avatar-color';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;

  avatarColor = avatarColor;

  /**
   * Labels can arrive in two shapes depending on the endpoint:
   * board GET → taskLabels: [{ id, label: { name, color } }]
   * merged updates → the nested label may be absent or flattened.
   * Normalize to a plain { name, color } list and skip anything malformed.
   */
  labels(): Pick<Label, 'name' | 'color'>[] {
    const raw = (this.task.taskLabels ?? []) as any[];
    return raw
      .map((tl) => tl?.label ?? (tl?.name && tl?.color ? tl : null))
      .filter((l): l is Label => !!l?.color);
  }

  priorityClass(priority: TaskPriority): string {
    return `prio-${priority.toLowerCase()}`;
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    // due_date is date-only (YYYY-MM-DD); only count as overdue once the day has passed.
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dueDate.substring(0, 10) < todayStr;
  }

  formatDue(dueDate: string): string {
    const [y, m, d] = dueDate.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }
}
