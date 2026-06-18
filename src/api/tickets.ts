import { api } from './client';
import type {
  Attachment,
  CreateTicketPayload,
  Status,
  Ticket,
  TicketFilters,
  TicketReply,
  UpdateTicketPayload,
} from '@/types';

// GET /tickets — backend, son kullanıcıyı otomatik olarak yalnızca kendi taleplerine kapsamlar.
export async function listTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.scope) params.scope = filters.scope;
  if (filters.search) params.search = filters.search;
  if (filters.tag) params.tag = filters.tag;
  if (filters.departmentId) params.departmentId = filters.departmentId;
  const { data } = await api.get<{ tickets: Ticket[] }>('/tickets', { params });
  return data.tickets;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await api.get<{ ticket: Ticket }>(`/tickets/${id}`);
  return data.ticket;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const { data } = await api.post<{ ticket: Ticket }>('/tickets', payload);
  return data.ticket;
}

export async function updateTicket(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
  const { data } = await api.put<{ ticket: Ticket }>(`/tickets/${id}`, payload);
  return data.ticket;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/tickets/${id}`);
}

export async function addReply(id: string, message: string, isInternal = false): Promise<TicketReply> {
  const { data } = await api.post<{ reply: TicketReply }>(`/tickets/${id}/replies`, { message, isInternal });
  return data.reply;
}

// Personel: talebi temsilcilere ata. PATCH /tickets/:id/assign (requireStaff).
export async function assignTicket(id: string, assigneeIds: string[]): Promise<Ticket> {
  const { data } = await api.patch<{ ticket: Ticket }>(`/tickets/${id}/assign`, { assigneeIds });
  return data.ticket;
}

// Personel: talebi yükselt (escalate). PATCH /tickets/:id/escalate (requireStaff).
export async function escalateTicket(id: string, reason = 'manual'): Promise<Ticket> {
  const { data } = await api.patch<{ ticket: Ticket }>(`/tickets/${id}/escalate`, { reason });
  return data.ticket;
}

// Personel: toplu işlem. POST /tickets/bulk (requireStaff).
export async function bulkTickets(
  ids: string[],
  action: 'status' | 'delete',
  opts?: { status?: Status },
): Promise<{ updated: number; skipped: number }> {
  const { data } = await api.post<{ updated: number; skipped: number }>('/tickets/bulk', {
    ids,
    action,
    ...(opts?.status ? { status: opts.status } : {}),
  });
  return data;
}

export async function reopenTicket(id: string): Promise<Ticket> {
  const { data } = await api.post<{ ticket: Ticket }>(`/tickets/${id}/reopen`, {});
  return data.ticket;
}

export async function submitCsat(id: string, rating: number, comment?: string): Promise<Ticket> {
  const { data } = await api.post<{ ticket: Ticket }>(`/tickets/${id}/csat`, {
    rating,
    ...(comment ? { comment } : {}),
  });
  return data.ticket;
}

export async function listTags(): Promise<string[]> {
  const { data } = await api.get<{ tags: string[] }>('/tickets/tags');
  return data.tags;
}

// Kamera/galeri ile çekilen görseli talebe ekler (multipart). Alan adı backend ile aynı: "files".
export async function uploadAttachment(
  id: string,
  file: { uri: string; name: string; type: string },
): Promise<Attachment[]> {
  const form = new FormData();
  // React Native FormData dosya formatı.
  form.append('files', { uri: file.uri, name: file.name, type: file.type } as any);
  const { data } = await api.post<{ attachments: Attachment[] }>(`/tickets/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.attachments;
}
