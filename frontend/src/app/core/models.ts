export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  created_at: string;
  members?: WorkspaceMember[];
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
  user?: User;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  created_by: string;
  created_at: string;
  columns: BoardColumn[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string | null;
  tasks: Task[];
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  column_id: string;
  board_id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
  creator?: User;
  taskLabels?: TaskLabel[];
}

export interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

export interface TaskLabel {
  id: string;
  task_id: string;
  label_id: string;
  label: Label;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: User;
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: 'ASSIGNED' | 'MENTIONED' | 'DEADLINE' | 'COMMENT' | 'MEMBER_ADDED';
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any> | null;
  actor: User | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  lastPage: number;
}

export interface WorkloadItem {
  userId: string;
  taskCount: string; // comes as string from backend — parse with parseInt()
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

/** Extracts a display-ready list of error messages from an HttpErrorResponse. */
export function apiErrorMessages(err: any): string[] {
  const msg = err?.error?.message;
  if (Array.isArray(msg)) return msg;
  if (typeof msg === 'string') return [msg];
  return ['Something went wrong. Please try again.'];
}
