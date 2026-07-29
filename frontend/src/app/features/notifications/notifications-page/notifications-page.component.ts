import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  loading = signal(true);
  all = signal<AppNotification[]>([]);

  ngOnInit() {
    this.notificationService.fetchAll().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(n: AppNotification) {
    if (!n.read) {
      this.notificationService.markAsRead(n.id);
      this.all.update((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const target = this.routeFor(n);
    if (target) this.router.navigate(target);
  }

  /** Backend links look like /tasks/:id or /workspaces/:id — map to real routes. */
  private routeFor(n: AppNotification): string[] | null {
    if (!n.link) return null;
    const ws = n.link.match(/^\/workspaces\/([^/]+)/);
    if (ws) return ['/workspaces', ws[1]];
    // Task links can't be deep-linked without knowing the board; ignore for now.
    return null;
  }

  icon(type: AppNotification['type']): string {
    switch (type) {
      case 'ASSIGNED': return '👤';
      case 'COMMENT': return '💬';
      case 'DEADLINE': return '⏰';
      case 'MEMBER_ADDED': return '🏠';
      default: return '🔔';
    }
  }

  timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
