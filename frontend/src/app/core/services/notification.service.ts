import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);
  private apiUrl = environment.apiUrl;

  private initialized = false;
  private socketSub: Subscription | null = null;

  /**
   * The bell's working set: UNREAD notifications only. Once something is
   * marked read it disappears from the dropdown for good (the full history,
   * read included, lives on the /notifications page).
   */
  notifications = signal<AppNotification[]>([]);
  unreadCount = computed(() => this.notifications().length);

  /** Called after every successful authentication. Safe to call repeatedly. */
  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.loadNotifications();
    this.listenForNewNotifications();
  }

  /** Called on logout — clears state and detaches the socket listener. */
  reset() {
    this.initialized = false;
    this.socketSub?.unsubscribe();
    this.socketSub = null;
    this.notifications.set([]);
  }

  loadNotifications() {
    this.http
      .get<AppNotification[]>(`${this.apiUrl}/notifications`)
      .subscribe((n) => this.notifications.set(n.filter((x) => !x.read)));
  }

  /** Full history (read + unread), for the notifications page. */
  fetchAll() {
    return this.http.get<AppNotification[]>(`${this.apiUrl}/notifications`);
  }

  listenForNewNotifications() {
    this.socketSub = this.socketService
      .on<AppNotification>('notification')
      .subscribe((n) => this.notifications.update((curr) => [n, ...curr]));
  }

  markAsRead(id: string) {
    this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}).subscribe(() => {
      this.notifications.update((ns) => ns.filter((n) => n.id !== id));
    });
  }

  markAllAsRead() {
    this.http.patch(`${this.apiUrl}/notifications/read-all`, {}).subscribe(() => {
      this.notifications.set([]);
    });
  }
}
