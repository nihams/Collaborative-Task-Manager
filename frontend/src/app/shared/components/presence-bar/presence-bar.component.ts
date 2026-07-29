import { Component, Input, computed, signal } from '@angular/core';
import { avatarColor } from '../../../core/avatar-color';
import { CommonModule } from '@angular/common';
import { User, WorkspaceMember } from '../../../core/models';

interface PresentUser {
  id: string;
  name: string;
  avatar_url: string | null;
}

@Component({
  selector: 'app-presence-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './presence-bar.component.html',
  styleUrl: './presence-bar.component.scss',
})
export class PresenceBarComponent {
  avatarColor = avatarColor;
  private userIdsSig = signal<string[]>([]);
  private membersSig = signal<WorkspaceMember[]>([]);

  /** userIds from the `presence-update` WebSocket event */
  @Input({ required: true }) set userIds(value: string[]) {
    this.userIdsSig.set(value ?? []);
  }

  /** Workspace members — used to resolve userIds to names/avatars */
  @Input() set members(value: WorkspaceMember[]) {
    this.membersSig.set(value ?? []);
  }

  readonly maxVisible = 4;

  presentUsers = computed<PresentUser[]>(() => {
    const byId = new Map<string, User>();
    this.membersSig().forEach((m) => {
      if (m.user) byId.set(m.user_id, m.user);
    });
    return this.userIdsSig().map((id) => {
      const user = byId.get(id);
      return {
        id,
        name: user?.name ?? 'Unknown user',
        avatar_url: user?.avatar_url ?? null,
      };
    });
  });

  visible = computed(() => this.presentUsers().slice(0, this.maxVisible));
  overflow = computed(() => Math.max(0, this.presentUsers().length - this.maxVisible));

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }
}
