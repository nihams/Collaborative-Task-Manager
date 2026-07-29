import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      const handler = (data: T) => observer.next(data);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  joinBoard(boardId: string): void {
    this.emit('join-board', { boardId });
  }

  leaveBoard(boardId: string): void {
    this.emit('leave-board', { boardId });
  }

  heartbeat(boardId: string): void {
    this.emit('heartbeat', { boardId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
