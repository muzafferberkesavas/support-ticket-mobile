import { api } from './client';
import type { CreateUserPayload, UpdateUserPayload, User } from '@/types';

// GET /users — personel listesi (atama adayları vb.). requireStaff.
export async function listUsers(filters: { departmentId?: string; role?: string; search?: string } = {}): Promise<User[]> {
  const params: Record<string, string> = {};
  if (filters.departmentId) params.departmentId = filters.departmentId;
  if (filters.role) params.role = filters.role;
  if (filters.search) params.search = filters.search;
  const { data } = await api.get<{ users: User[] }>('/users', { params });
  return data.users;
}

// POST /users (admin) — yeni kullanıcı + geçici parola döner.
export async function createUser(payload: CreateUserPayload): Promise<{ user: User; tempPassword: string }> {
  const { data } = await api.post<{ user: User; tempPassword: string }>('/users', payload);
  return data;
}

// PUT /users/:id (admin) — rol, ad, departman üyelikleri.
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await api.put<{ user: User }>(`/users/${id}`, payload);
  return data.user;
}

// DELETE /users/:id (admin).
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
