import { Injectable } from '@angular/core';

export interface KnownBoard {
  id: string;
  name: string;
}

const STORAGE_KEY = 'ctm.known-boards';

/**
 * The backend exposes no endpoint to list the boards of a workspace
 * (only POST /boards and GET /boards/:id). Until such an endpoint exists,
 * this registry remembers boards this browser has created or opened,
 * keyed by workspace id. It stores only board ids and names — never tokens.
 */
@Injectable({ providedIn: 'root' })
export class BoardRegistryService {
  private read(): Record<string, KnownBoard[]> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private write(data: Record<string, KnownBoard[]>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  boardsFor(workspaceId: string): KnownBoard[] {
    return this.read()[workspaceId] ?? [];
  }

  remember(workspaceId: string, board: KnownBoard) {
    const data = this.read();
    const list = data[workspaceId] ?? [];
    const existing = list.find((b) => b.id === board.id);
    if (existing) {
      existing.name = board.name;
    } else {
      list.push(board);
    }
    data[workspaceId] = list;
    this.write(data);
  }

  forget(workspaceId: string, boardId: string) {
    const data = this.read();
    data[workspaceId] = (data[workspaceId] ?? []).filter((b) => b.id !== boardId);
    this.write(data);
  }
}
