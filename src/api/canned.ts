import { api } from './client';

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  createdById: string | null;
  departmentId: string | null;
  createdAt: string;
}

export interface CannedInput {
  title: string;
  body: string;
  departmentId?: string | null;
}

// /canned — hazır yanıtlar (requireStaff).
export async function listCanned(): Promise<CannedResponse[]> {
  const { data } = await api.get<{ responses: CannedResponse[] }>('/canned');
  return data.responses;
}

export async function createCanned(payload: CannedInput): Promise<CannedResponse> {
  const { data } = await api.post<{ response: CannedResponse }>('/canned', payload);
  return data.response;
}

export async function updateCanned(id: string, payload: CannedInput): Promise<CannedResponse> {
  const { data } = await api.put<{ response: CannedResponse }>(`/canned/${id}`, payload);
  return data.response;
}

export async function deleteCanned(id: string): Promise<void> {
  await api.delete(`/canned/${id}`);
}
