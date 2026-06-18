import { api } from './client';

export interface JobStats {
  active: number;
  completed: number;
  failed: number;
  waiting: number;
  delayed: number;
}

export interface RecentOp {
  id: string;
  name: string;
  status: 'completed' | 'failed';
  finishedAt: number | null;
  summary: string;
}

export type ExportEntity = 'tickets' | 'users';
export type ExportFormat = 'csv' | 'excel' | 'pdf';

// GET /jobs/stats (requireAdmin) — anlık sayaçlar + son işlemler.
export async function getJobStats(): Promise<{ stats: JobStats; recent: RecentOp[] }> {
  const { data } = await api.get<{ stats: JobStats; recent: RecentOp[] }>('/jobs/stats');
  return data;
}

// POST /jobs/export (requireStaff) — worker dosyayı üretip e-posta ile gönderir (asenkron).
export async function exportByEmail(entity: ExportEntity, format: ExportFormat): Promise<void> {
  await api.post('/jobs/export', { entity, format });
}
