import { api } from './client';
import type { Department } from '@/types';

// GET /departments — herkese açık (filtre/atama için). create/update/delete admin'dir.
export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<{ departments: Department[] }>('/departments');
  return data.departments;
}
