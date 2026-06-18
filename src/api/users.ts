import { api } from './client';
import type { User } from '@/types';

// GET /users — personel listesi (atama adayları vb.). requireStaff.
export async function listUsers(filters: { departmentId?: string; role?: string; search?: string } = {}): Promise<User[]> {
  const params: Record<string, string> = {};
  if (filters.departmentId) params.departmentId = filters.departmentId;
  if (filters.role) params.role = filters.role;
  if (filters.search) params.search = filters.search;
  const { data } = await api.get<{ users: User[] }>('/users', { params });
  return data.users;
}
