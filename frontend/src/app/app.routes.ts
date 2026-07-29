import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/workspaces', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'workspaces',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace-list/workspace-list.component').then(
        (m) => m.WorkspaceListComponent,
      ),
  },
  {
    path: 'workspaces/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace-detail/workspace-detail.component').then(
        (m) => m.WorkspaceDetailComponent,
      ),
  },
  {
    path: 'my-tasks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/my-tasks/my-tasks.component').then(
        (m) => m.MyTasksComponent,
      ),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications-page/notifications-page.component').then(
        (m) => m.NotificationsPageComponent,
      ),
  },
  {
    path: 'board/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/board/board-view/board-view.component').then(
        (m) => m.BoardViewComponent,
      ),
  },
  { path: '**', redirectTo: '/workspaces' },
];
