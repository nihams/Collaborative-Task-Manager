import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { avatarColor } from '../../../core/avatar-color';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationBellComponent } from '../../../features/notifications/notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  avatarColor = avatarColor;
  authService = inject(AuthService);

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }

  logout() {
    this.authService.logout();
  }
}
