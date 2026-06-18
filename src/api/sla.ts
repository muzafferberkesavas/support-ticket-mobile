import { api } from './client';

export interface SlaTargets {
  high: { response: number; resolution: number };
  medium: { response: number; resolution: number };
  low: { response: number; resolution: number };
}

// GET /sla (requireManager).
export async function getSla(): Promise<SlaTargets> {
  const { data } = await api.get<{ targets: SlaTargets }>('/sla');
  return data.targets;
}

// PUT /sla (requireAdmin) — tüm hedefleri tek seferde gönderir.
export async function updateSla(targets: SlaTargets): Promise<SlaTargets> {
  const { data } = await api.put<{ targets: SlaTargets }>('/sla', targets);
  return data.targets;
}
