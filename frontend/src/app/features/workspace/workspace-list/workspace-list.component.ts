import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Workspace, apiErrorMessages } from '../../../core/models';

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspace-list.component.html',
  styleUrl: './workspace-list.component.scss',
})
export class WorkspaceListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private apiUrl = environment.apiUrl;

  workspaces = signal<Workspace[]>([]);
  loading = signal(true);
  creating = signal(false);
  showCreateForm = signal(false);
  apiErrors = signal<string[]>([]);

  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(200)]],
  });

  ngOnInit() {
    this.http.get<Workspace[]>(`${this.apiUrl}/workspaces/mine`).subscribe({
      next: (ws) => {
        this.workspaces.set(ws);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleCreate() {
    this.showCreateForm.update((v) => !v);
    this.apiErrors.set([]);
    this.createForm.reset();
  }

  create() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.apiErrors.set([]);
    const { name, description } = this.createForm.getRawValue();
    const body: { name: string; description?: string } = { name };
    if (description.trim()) body.description = description.trim();

    this.http.post<Workspace>(`${this.apiUrl}/workspaces`, body).subscribe({
      next: (ws) => {
        this.workspaces.update((list) => [...list, { ...ws, role: 'OWNER' }]);
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.createForm.reset();
      },
      error: (err) => {
        this.apiErrors.set(apiErrorMessages(err));
        this.creating.set(false);
      },
    });
  }

  open(ws: Workspace) {
    this.router.navigate(['/workspaces', ws.id]);
  }

  memberCount(ws: Workspace): number {
    return ws.members?.length ?? 0;
  }
}
