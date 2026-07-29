import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskDetailComponent } from '../task-detail/task-detail.component';
import { PresenceBarComponent } from '../../../shared/components/presence-bar/presence-bar.component';
import {
  Board,
  BoardColumn,
  Task,
  Label,
  Workspace,
  WorkspaceMember,
  apiErrorMessages,
} from '../../../core/models';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DragDropModule,
    TaskCardComponent,
    TaskDetailComponent,
    PresenceBarComponent,
  ],
  templateUrl: './board-view.component.html',
  styleUrl: './board-view.component.scss',
})
export class BoardViewComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private authService = inject(AuthService);
  linkCopied = signal(false);

  renamingBoard = signal(false);
  boardNameDraft = '';

  startRenameBoard() {
    const b = this.board();
    if (!b) return;
    this.boardNameDraft = b.name;
    this.renamingBoard.set(true);
  }

  saveBoardName() {
    const b = this.board();
    const name = this.boardNameDraft.trim();
    if (!b || !this.renamingBoard()) return;
    if (name === b.name || name.length < 2) {
      this.renamingBoard.set(false);
      return;
    }
    this.http.patch(`${this.apiUrl}/boards/${b.id}`, { name }).subscribe({
      next: () => {
        this.board.set({ ...b, name });
        this.renamingBoard.set(false);
      },
      error: () => this.renamingBoard.set(false),
    });
  }

  copyBoardLink() {
    const b = this.board();
    if (!b) return;
    const url = `${window.location.origin}/board/${b.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }
  private apiUrl = environment.apiUrl;

  boardId = '';
  board = signal<Board | null>(null);
  workspaceMembers = signal<WorkspaceMember[]>([]);
  loading = signal(true);
  errors = signal<string[]>([]);

  presentUserIds = signal<string[]>([]);
  otherPresentUserIds = computed(() => {
    const me = this.authService.currentUser()?.id;
    return this.presentUserIds().filter((id) => id !== me);
  });

  selectedTaskId = signal<string | null>(null);
  knownLabels = signal<Label[]>([]);

  // Inline "add task" state per column
  addingTaskColumnId = signal<string | null>(null);
  newTaskTitle = '';

  // Inline "add column" state
  addingColumn = signal(false);
  newColumnName = '';

  // Inline column rename state
  editingColumnId = signal<string | null>(null);
  columnNameDraft = '';

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private presenceSub: Subscription | null = null;

  ngOnInit() {
    this.boardId = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetchBoard();

    // Real-time presence
    this.socketService.joinBoard(this.boardId);
    this.presenceSub = this.socketService
      .on<string[]>('presence-update')
      .subscribe((userIds) => this.presentUserIds.set(userIds));

    // Keep Redis presence TTL alive while viewing the board
    this.heartbeatInterval = setInterval(() => {
      this.socketService.heartbeat(this.boardId);
    }, 30000);
  }

  ngOnDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.presenceSub?.unsubscribe();
    this.socketService.leaveBoard(this.boardId);
  }

  private fetchBoard() {
    this.http.get<Board>(`${this.apiUrl}/boards/${this.boardId}`).subscribe({
      next: (board) => {
        // Board response is pre-sorted server-side — render as-is.
        this.board.set(board);
        // The backend now includes taskLabels in the board payload — seed the
        // known-labels list so the attach-existing dropdown is populated upfront.
        const seen = new Map<string, Label>();
        for (const col of board.columns ?? []) {
          for (const task of col.tasks ?? []) {
            for (const tl of (task.taskLabels ?? []) as any[]) {
              if (tl?.label?.id) seen.set(tl.label.id, tl.label);
            }
          }
        }
        if (seen.size) this.onLabelsDiscovered([...seen.values()]);
        this.loading.set(false);
        this.fetchWorkspaceMembers(board.workspace_id);
      },
      error: (err) => {
        this.errors.set(apiErrorMessages(err));
        this.loading.set(false);
      },
    });
  }

  private fetchWorkspaceMembers(workspaceId: string) {
    this.http.get<Workspace>(`${this.apiUrl}/workspaces/${workspaceId}`).subscribe({
      next: (ws) => this.workspaceMembers.set(ws.members ?? []),
      error: () => {},
    });
  }

  private refreshBoardSignal() {
    const b = this.board();
    if (b) this.board.set({ ...b });
  }

  // ── Drag and drop ──────────────────────────────────────────

  onTaskDrop(event: CdkDragDrop<Task[]>) {
    const board = this.board();
    if (!board) return;

    // Snapshot for revert on API failure
    const snapshot = board.columns.map((c) => ({ id: c.id, tasks: [...c.tasks] }));

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    const task = event.container.data[event.currentIndex];
    const newColumnId = event.container.id;
    const newPosition = this.calculatePosition(event.container.data, event.currentIndex);

    // Optimistic update
    task.column_id = newColumnId;
    task.position = newPosition;
    this.refreshBoardSignal();

    this.updateTaskPosition(task, newColumnId, newPosition, snapshot);
  }

  calculatePosition(tasks: Task[], index: number): number {
    const before = tasks[index - 1]?.position ?? 0;
    const after = tasks[index + 1]?.position ?? before + 2000;
    return Math.floor((before + after) / 2);
  }

  private updateTaskPosition(
    task: Task,
    columnId: string,
    position: number,
    snapshot: { id: string; tasks: Task[] }[],
  ) {
    this.http
      .patch<Task>(`${this.apiUrl}/tasks/${task.id}/move`, {
        column_id: columnId,
        position,
      })
      .subscribe({
        error: () => {
          // Revert the optimistic update
          const board = this.board();
          if (!board) return;
          board.columns.forEach((col) => {
            const snap = snapshot.find((s) => s.id === col.id);
            if (snap) col.tasks = snap.tasks;
          });
          this.refreshBoardSignal();
          this.errors.set(['Could not move task — your board has been restored.']);
          setTimeout(() => this.errors.set([]), 4000);
        },
      });
  }

  columnIds(): string[] {
    return this.board()?.columns.map((c) => c.id) ?? [];
  }

  // ── Tasks ──────────────────────────────────────────────────

  startAddTask(columnId: string) {
    this.addingTaskColumnId.set(columnId);
    this.newTaskTitle = '';
  }

  cancelAddTask() {
    this.addingTaskColumnId.set(null);
    this.newTaskTitle = '';
  }

  addTask(column: BoardColumn) {
    const board = this.board();
    const title = this.newTaskTitle.trim();
    if (!board || !title) return;

    this.http
      .post<Task>(`${this.apiUrl}/tasks`, {
        title,
        column_id: column.id,
        board_id: board.id,
        workspace_id: board.workspace_id,
      })
      .subscribe({
        next: (task) => {
          column.tasks.push(task);
          this.refreshBoardSignal();
          this.newTaskTitle = '';
          this.addingTaskColumnId.set(null);
        },
        error: (err) => this.errors.set(apiErrorMessages(err)),
      });
  }

  openTask(task: Task) {
    this.selectedTaskId.set(task.id);
  }

  onTaskUpdated(updated: Task) {
    const board = this.board();
    if (!board) return;
    for (const column of board.columns) {
      const idx = column.tasks.findIndex((t) => t.id === updated.id);
      if (idx !== -1) {
        column.tasks[idx] = { ...column.tasks[idx], ...updated };
        break;
      }
    }
    this.refreshBoardSignal();
  }

  onTaskDeleted(taskId: string) {
    const board = this.board();
    if (!board) return;
    board.columns.forEach((c) => {
      c.tasks = c.tasks.filter((t) => t.id !== taskId);
    });
    this.refreshBoardSignal();
    this.selectedTaskId.set(null);
  }

  onLabelsDiscovered(labels: Label[]) {
    this.knownLabels.update((known) => {
      const map = new Map(known.map((l) => [l.id, l]));
      labels.forEach((l) => map.set(l.id, l));
      return [...map.values()];
    });
  }

  // ── Columns ────────────────────────────────────────────────

  addColumn() {
    const name = this.newColumnName.trim();
    if (!name) return;

    this.http
      .post<BoardColumn>(`${this.apiUrl}/boards/${this.boardId}/columns`, { name })
      .subscribe({
        next: (column) => {
          const board = this.board();
          if (board) {
            board.columns.push({ ...column, tasks: column.tasks ?? [] });
            this.refreshBoardSignal();
          }
          this.newColumnName = '';
          this.addingColumn.set(false);
        },
        error: (err) => this.errors.set(apiErrorMessages(err)),
      });
  }

  startRenameColumn(column: BoardColumn) {
    this.editingColumnId.set(column.id);
    this.columnNameDraft = column.name;
  }

  saveColumnName(column: BoardColumn) {
    const name = this.columnNameDraft.trim();
    this.editingColumnId.set(null);
    if (!name || name === column.name) return;

    this.http.patch<BoardColumn>(`${this.apiUrl}/columns/${column.id}`, { name }).subscribe({
      next: () => {
        column.name = name;
        this.refreshBoardSignal();
      },
      error: (err) => this.errors.set(apiErrorMessages(err)),
    });
  }

  deleteColumn(column: BoardColumn) {
    const label =
      column.tasks.length > 0
        ? `Delete "${column.name}" and its ${column.tasks.length} task(s)?`
        : `Delete "${column.name}"?`;
    if (!confirm(label)) return;

    this.http.delete(`${this.apiUrl}/columns/${column.id}`).subscribe({
      next: () => {
        const board = this.board();
        if (board) {
          board.columns = board.columns.filter((c) => c.id !== column.id);
          this.refreshBoardSignal();
        }
      },
      error: (err) => this.errors.set(apiErrorMessages(err)),
    });
  }
}
