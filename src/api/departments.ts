import { api } from './client';
import type { Department, DepartmentInput } from '@/types';

// GET /departments — herkese açık (filtre/atama için). create/update/delete admin'dir.
export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<{ departments: Department[] }>('/departments');
  return data.departments;
}

// POST /departments (admin).
export async function createDepartment(payload: DepartmentInput): Promise<Department> {
  const { data } = await api.post<{ department: Department }>('/departments', payload);
  return data.department;
}

// PUT /departments/:id (admin).
export async function updateDepartment(id: string, payload: DepartmentInput): Promise<Department> {
  const { data } = await api.put<{ department: Department }>(`/departments/${id}`, payload);
  return data.department;
}

// DELETE /departments/:id (admin).
export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}
