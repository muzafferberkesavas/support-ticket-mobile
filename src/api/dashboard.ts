import { api } from './client';
import type { DashboardData } from '@/types';

// GET /dashboard — personel genel bakışı (KPI + hızlı listeler). requireStaff.
export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}
