import type { Role } from '@/types';

// Web auth store getter'larıyla aynı rol mantığı.
export const isStaffRole = (r?: Role | null): boolean =>
  r === 'agent' || r === 'team_lead' || r === 'admin';
export const isManagerRole = (r?: Role | null): boolean => r === 'team_lead' || r === 'admin';
export const isAdminRole = (r?: Role | null): boolean => r === 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Kullanıcı',
  agent: 'Temsilci',
  team_lead: 'Takım Lideri',
  admin: 'Yönetici',
};
