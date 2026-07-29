import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { avatarColor } from '../../../core/avatar-color';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  Task,
  TaskPriority,
  Comment,
  Label,
  AuditLog,
  WorkspaceMember,
  apiErrorMessages,
} from '../../../core/models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss',
})
export class TaskDetailComponent implements OnChanges {
  avatarColor = avatarColor;
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  @Input({ required: true }) taskId!: string;
  @Input() members: WorkspaceMember[] = [];
  @Input() knownLabels: Label[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() labelsDiscovered = new EventEmitter<Label[]>();

  task = signal<Task | null>(null);
  comments = signal<Comment[]>([]);
  auditTrail = signal<AuditLog[]>([]);
  auditAvailable = signal(true);
  loading = signal(true);
  errors = signal<string[]>([]);

  editingTitle = signal(false);
  titleDraft = '';
  descriptionDraft = '';
  dueDraft = '';
  commentDraft = '';
  postingComment = signal(false);

  showLabelForm = signal(false);
  newLabelName = '';
  newLabelColor = '#5b5bd6';
  attachLabelId = '';

  readonly priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['taskId'] && this.taskId) {
      this.loadTask();
    }
  }

  private loadTask() {
    this.loading.set(true);
    this.errors.set([]);
    this.editingTitle.set(false);

    this.http.get<Task>(`${this.apiUrl}/tasks/${this.taskId}`).subscribe({
      next: (task) => {
        this.setTask(task);
        this.loading.set(false);
      },
      error: (err) => {
        this.errors.set(apiErrorMessages(err));
        this.loading.set(false);
      },
    });

    this.http.get<Comment[]>(`${this.apiUrl}/tasks/${this.taskId}/comments`).subscribe({
      next: (comments) => this.comments.set(comments),
      error: () => this.comments.set([]),
    });

    // The audit endpoint may not exist on every backend build — fail quietly.
    this.http.get<AuditLog[]>(`${this.apiUrl}/audit-log/TASK/${this.taskId}`).subscribe({
      next: (logs) => {
        this.auditTrail.set(logs);
        this.auditAvailable.set(true);
      },
      error: () => this.auditAvailable.set(false),
    });
  }

  private setTask(task: Task) {
    this.task.set(task);
    this.titleDraft = task.title;
    this.descriptionDraft = task.description ?? '';
    this.dueDraft = task.due_date ? task.due_date.substring(0, 10) : '';
    const labels = (task.taskLabels ?? []).map((tl) => tl.label);
    if (labels.length) this.labelsDiscovered.emit(labels);
  }

  private patch(body: Record<string, unknown>) {
    this.errors.set([]);
    this.http.patch<Task>(`${this.apiUrl}/tasks/${this.taskId}`, body).subscribe({
      next: (updated) => {
        const merged: Task = { ...this.task()!, ...updated };
        // The PATCH response includes fresh relations; keep them.
        this.setTask(merged);
        this.taskUpdated.emit(merged);
      },
      error: (err) => this.errors.set(apiErrorMessages(err)),
    });
  }

  // ── Field editors ─────────────────────────────────────────

  startTitleEdit() {
    this.titleDraft = this.task()?.title ?? '';
    this.editingTitle.set(true);
  }

  saveTitle() {
    this.editingTitle.set(false);
    const title = this.titleDraft.trim();
    if (title && title !== this.task()?.title) {
      this.patch({ title });
    }
  }

  savePriority(priority: string) {
    this.patch({ priority });
  }

  saveDueDate() {
    if (!this.dueDraft) return;
    // The backend column is MySQL DATE — a full ISO timestamp ("...T18:30:00.000Z")
    // fails strict-mode insertion and 500s. The date input's raw value is already
    // YYYY-MM-DD, which both IsDateString and MySQL DATE accept.
    this.patch({ due_date: this.dueDraft });
  }

  saveAssignee(userId: string) {
    this.patch({ assigned_to: userId || null });
  }

  saveDescription() {
    const desc = this.descriptionDraft.trim();
    if (desc !== (this.task()?.description ?? '')) {
      this.patch({ description: desc });
    }
  }

  // ── Labels ────────────────────────────────────────────────

  get attachableLabels(): Label[] {
    const attached = new Set((this.task()?.taskLabels ?? []).map((tl) => tl.label_id));
    return this.knownLabels.filter((l) => !attached.has(l.id));
  }

  attachLabel() {
    if (!this.attachLabelId) return;
    this.http
      .post(`${this.apiUrl}/tasks/${this.taskId}/labels`, { label_id: this.attachLabelId })
      .subscribe({
        next: () => {
          this.attachLabelId = '';
          this.refreshTask();
        },
        error: (err) => this.errors.set(apiErrorMessages(err)),
      });
  }

  createAndAttachLabel() {
    const name = this.newLabelName.trim();
    const workspaceId = this.task()?.workspace_id;
    if (!name || !workspaceId) return;

    this.http
      .post<Label>(`${this.apiUrl}/workspaces/${workspaceId}/labels`, {
        name,
        color: this.newLabelColor,
      })
      .subscribe({
        next: (label) => {
          this.labelsDiscovered.emit([label]);
          this.newLabelName = '';
          this.showLabelForm.set(false);
          this.http
            .post(`${this.apiUrl}/tasks/${this.taskId}/labels`, { label_id: label.id })
            .subscribe({ next: () => this.refreshTask() });
        },
        error: (err) => this.errors.set(apiErrorMessages(err)),
      });
  }

  removeLabel(labelId: string) {
    this.http
      .delete(`${this.apiUrl}/tasks/${this.taskId}/labels/${labelId}`)
      .subscribe({ next: () => this.refreshTask() });
  }

  private refreshTask() {
    this.http.get<Task>(`${this.apiUrl}/tasks/${this.taskId}`).subscribe({
      next: (task) => {
        this.setTask(task);
        this.taskUpdated.emit(task);
      },
    });
  }

  // ── Comments ──────────────────────────────────────────────

  postComment() {
    const content = this.commentDraft.trim();
    if (!content) return;
    this.postingComment.set(true);
    this.http
      .post<Comment>(`${this.apiUrl}/tasks/${this.taskId}/comments`, { content })
      .subscribe({
        next: (comment) => {
          this.comments.update((c) => [...c, comment]);
          this.commentDraft = '';
          this.postingComment.set(false);
        },
        error: (err) => {
          this.errors.set(apiErrorMessages(err));
          this.postingComment.set(false);
        },
      });
  }

  // ── Delete ────────────────────────────────────────────────

  deleteTask() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    this.http.delete(`${this.apiUrl}/tasks/${this.taskId}`).subscribe({
      next: () => this.taskDeleted.emit(this.taskId),
      error: (err) => this.errors.set(apiErrorMessages(err)),
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  humanizeAction(action: string): string {
    return action.replaceAll('_', ' ').toLowerCase();
  }
}
