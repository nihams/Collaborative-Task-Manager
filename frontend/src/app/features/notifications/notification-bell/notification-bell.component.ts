import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  notificationService = inject(NotificationService);
  private router = inject(Router);
  private host = inject(ElementRef);

  open = signal(false);

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  toggle() {
    this.open.update((v) => !v);
  }

  onNotificationClick(notification: AppNotification) {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    this.open.set(false);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  relativeTime(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  typeIcon(type: AppNotification['type']): string {
    switch (type) {
      case 'ASSIGNED': return '👤';
      case 'MENTIONED': return '💬';
      case 'DEADLINE': return '⏰';
      case 'COMMENT': return '📝';
      case 'MEMBER_ADDED': return '🏠';
      default: return '🔔';
    }
  }
}
