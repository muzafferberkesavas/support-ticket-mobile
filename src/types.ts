// Backend (support-ticket-system) ile birebir uyumlu tipler.
export type Role = 'user' | 'agent' | 'team_lead' | 'admin';
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'open' | 'in_progress' | 'closed';
export type TicketScope = 'all' | 'mine' | 'unassigned' | 'created';

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName?: string | null;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'role' | 'fullName'>;

export interface SlaInfo {
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  responseDueAt: string;
  resolutionDueAt: string;
  responseOverdue: boolean;
  resolutionOverdue: boolean;
  breached: boolean;
  ageMinutes: number;
  resolutionRemainingMinutes: number | null;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploaderId: string | null;
  createdAt: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  author: PublicUser;
}

export interface TicketAssignee {
  id: string;
  ticketId: string;
  userId: string;
  user: PublicUser;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: Priority;
  status: Status;
  category?: string | null;
  tags?: string[];
  userId: string;
  departmentId?: string | null;
  escalated?: boolean;
  escalatedAt?: string | null;
  csatRating?: number | null;
  csatComment?: string | null;
  csatAt?: string | null;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  user?: PublicUser;
  department?: { id: string; name: string } | null;
  assignees?: TicketAssignee[];
  replies?: TicketReply[];
  attachments?: Attachment[];
  sla?: SlaInfo;
  _count?: { replies: number; attachments?: number };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TicketFilters {
  status?: Status;
  priority?: Priority;
  scope?: TicketScope;
  search?: string;
  tag?: string;
  departmentId?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  members?: PublicUser[];
  _count?: { tickets?: number; members?: number };
}

// GET /dashboard (personel) — KPI sayıları + hızlı listeler.
export interface DashboardData {
  counts: { myOpen: number; slaRisk: number; unassigned: number; resolvedToday: number };
  myOpen: Ticket[];
  slaRisk: Ticket[];
  unassigned: Ticket[];
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  priority: Priority;
  category?: string | null;
  tags?: string[];
}

export interface UpdateTicketPayload {
  subject?: string;
  message?: string;
  priority?: Priority;
  category?: string | null;
  tags?: string[];
  // Personel alanları (backend yalnızca staff'a izin verir).
  status?: Status;
  departmentId?: string | null;
}
