import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Task, TaskPriority } from '../../../core/models';

interface BoardGroup {
  boardId: string;
  boardName: string;
  tasks: Task[];
}

/**
 * Expects GET /tasks/assigned-to-me → Task[] where each task carries at least
 * board_id (always on the entity) and ideally a `board: { id, name }` relation.
 * If the relation is absent, the group falls back to a shortened board id.
 */
@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-tasks.component.html',
  styleUrl: './my-tasks.component.scss',
})
export class MyTasksComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  error = signal(false);
  tasks = signal<Task[]>([]);

  groups = computed<BoardGroup[]>(() => {
    const byBoard = new Map<string, BoardGroup>();
    for (const task of this.tasks()) {
      const id = task.board_id;
      if (!byBoard.has(id)) {
        const name = (task as any).board?.name ?? `Board ${id.substring(0, 8)}…`;
        byBoard.set(id, { boardId: id, boardName: name, tasks: [] });
      }
      byBoard.get(id)!.tasks.push(task);
    }
    const groups = [...byBoard.values()];
    // Within each board: tasks with due dates first (soonest first), then undated.
    for (const g of groups) {
      g.tasks.sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    groups.sort((a, b) => a.boardName.localeCompare(b.boardName));
    return groups;
  });

  totalCount = computed(() => this.tasks().length);
  overdueCount = computed(() => this.tasks().filter((t) => this.isOverdue(t.due_date)).length);

  ngOnInit() {
    this.http.get<Task[]>(`${this.apiUrl}/tasks/assigned-to-me`).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dueDate.substring(0, 10) < todayStr;
  }

  formatDue(dueDate: string): string {
    const [y, m, d] = dueDate.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: y !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

  priorityClass(priority: TaskPriority): string {
    return `prio-${priority.toLowerCase()}`;
  }
}
