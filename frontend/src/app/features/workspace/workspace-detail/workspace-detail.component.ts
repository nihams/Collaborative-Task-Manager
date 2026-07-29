import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { avatarColor } from '../../../core/avatar-color';
import {
  Workspace,
  WorkspaceMember,
  Board,
  WorkloadItem,
  apiErrorMessages,
} from '../../../core/models';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './workspace-detail.component.html',
  styleUrl: './workspace-detail.component.scss',
})
export class WorkspaceDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  avatarColor = avatarColor;

  workspaceId = '';
  workspace = signal<Workspace | null>(null);
  loading = signal(true);
  boards = signal<Board[]>([]);
  boardsLoading = signal(true);
  workload = signal<Map<string, number>>(new Map());

  showBoardForm = signal(false);
  creatingBoard = signal(false);
  boardErrors = signal<string[]>([]);

  showInviteForm = signal(false);
  inviting = signal(false);
  inviteErrors = signal<string[]>([]);
  inviteSuccess = signal('');

  // Inline workspace rename
  renaming = signal(false);
  renameDraft = '';
  renameErrors = signal<string[]>([]);

  myRole = computed<'OWNER' | 'ADMIN' | 'MEMBER' | null>(() => {
    const me = this.authService.currentUser();
    const ws = this.workspace();
    if (!me || !ws?.members) return null;
    return ws.members.find((m) => m.user_id === me.id)?.role ?? null;
  });

  canManage = computed(() => {
    const role = this.myRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

  boardForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  });

  inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['MEMBER' as 'ADMIN' | 'MEMBER', [Validators.required]],
  });

  ngOnInit() {
    this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetchWorkspace();
    this.fetchBoards();
    this.fetchWorkload();
  }

  private fetchWorkspace() {
    this.http.get<Workspace>(`${this.apiUrl}/workspaces/${this.workspaceId}`).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/workspaces']);
      },
    });
  }

  private fetchBoards() {
    this.http
      .get<Board[]>(`${this.apiUrl}/workspaces/${this.workspaceId}/boards`)
      .subscribe({
        next: (boards) => {
          this.boards.set(boards);
          this.boardsLoading.set(false);
        },
        error: () => this.boardsLoading.set(false),
      });
  }

  private fetchWorkload() {
    this.http
      .get<WorkloadItem[]>(`${this.apiUrl}/workspaces/${this.workspaceId}/workload`)
      .subscribe({
        next: (items) => {
          const map = new Map<string, number>();
          // taskCount comes back as a string from the backend aggregate
          items.forEach((item) => map.set(item.userId, parseInt(item.taskCount)));
          this.workload.set(map);
        },
        error: () => {},
      });
  }

  taskCountFor(userId: string): number {
    return this.workload().get(userId) ?? 0;
  }

  // ── Workspace rename ───────────────────────────────────────

  startRename() {
    const ws = this.workspace();
    if (!ws || !this.canManage()) return;
    this.renameDraft = ws.name;
    this.renameErrors.set([]);
    this.renaming.set(true);
  }

  saveRename() {
    const ws = this.workspace();
    const name = this.renameDraft.trim();
    if (!ws || !this.renaming()) return;
    if (name === ws.name || name.length < 2) {
      this.renaming.set(false);
      return;
    }
    this.http.patch<Workspace>(`${this.apiUrl}/workspaces/${ws.id}`, { name }).subscribe({
      next: () => {
        this.workspace.set({ ...ws, name });
        this.renaming.set(false);
      },
      error: (err) => this.renameErrors.set(apiErrorMessages(err)),
    });
  }

  // ── Boards ─────────────────────────────────────────────────

  createBoard() {
    if (this.boardForm.invalid) {
      this.boardForm.markAllAsTouched();
      return;
    }
    this.creatingBoard.set(true);
    this.boardErrors.set([]);
    const { name } = this.boardForm.getRawValue();

    this.http
      .post<Board>(`${this.apiUrl}/boards`, { name, workspace_id: this.workspaceId })
      .subscribe({
        next: (board) => {
          this.creatingBoard.set(false);
          this.showBoardForm.set(false);
          this.boardForm.reset();
          this.router.navigate(['/board', board.id]);
        },
        error: (err) => {
          this.boardErrors.set(apiErrorMessages(err));
          this.creatingBoard.set(false);
        },
      });
  }

  // ── Members ────────────────────────────────────────────────

  invite() {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.inviting.set(true);
    this.inviteErrors.set([]);
    this.inviteSuccess.set('');
    const { email, role } = this.inviteForm.getRawValue();

    this.http
      .post<WorkspaceMember>(`${this.apiUrl}/workspaces/${this.workspaceId}/members`, {
        email,
        role,
      })
      .subscribe({
        next: () => {
          this.inviting.set(false);
          this.inviteSuccess.set(`Invited ${email} as ${role}.`);
          this.inviteForm.reset({ email: '', role: 'MEMBER' });
          this.fetchWorkspace();
        },
        error: (err) => {
          this.inviteErrors.set(apiErrorMessages(err));
          this.inviting.set(false);
        },
      });
  }

  removeMember(member: WorkspaceMember) {
    if (!confirm(`Remove ${member.user?.name ?? 'this member'} from the workspace?`)) return;
    this.http
      .delete(`${this.apiUrl}/workspaces/${this.workspaceId}/members/${member.user_id}`)
      .subscribe({ next: () => this.fetchWorkspace() });
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
