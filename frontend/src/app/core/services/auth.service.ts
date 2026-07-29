import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';
import { User } from '../models';

export interface AuthResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private notificationService = inject(NotificationService);

  // Tokens live in memory only — never in localStorage/sessionStorage.
  private accessToken = signal<string | null>(null);
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.accessToken());

  getAccessToken(): string | null {
    return this.accessToken();
  }

  /** Fetches the full user profile from GET /auth/me. */
  fetchCurrentUser() {
    this.http.get<User>(`${this.apiUrl}/auth/me`).subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => {},
    });
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, { name, email, password })
      .pipe(tap((r) => this.handleAuthSuccess(r.accessToken)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap((r) => this.handleAuthSuccess(r.accessToken)));
  }

  logout() {
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  refreshToken() {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((r) => this.handleAuthSuccess(r.accessToken)));
  }

  private handleAuthSuccess(token: string) {
    this.accessToken.set(token);
    this.socketService.connect(token);
    this.notificationService.init();
    this.fetchCurrentUser();
  }

  private clearSession() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.socketService.disconnect();
    this.notificationService.reset();
    this.router.navigate(['/login']);
  }
}
