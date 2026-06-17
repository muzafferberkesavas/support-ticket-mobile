import type { Priority, Status } from '@/types';

// Web arayüzüyle (PrimeVue severity'leri) tutarlı renk paleti.
export const colors = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  // Severity renkleri (web ile aynı anlam).
  success: '#16a34a',
  successBg: '#dcfce7',
  info: '#2563eb',
  infoBg: '#dbeafe',
  warn: '#d97706',
  warnBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  secondary: '#64748b',
  secondaryBg: '#e2e8f0',
  white: '#ffffff',
};

type Tone = { fg: string; bg: string };

// Önem (priority): low=yeşil, medium=mavi, high=kırmızı — web ile aynı.
export const PRIORITY_META: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: 'Düşük', tone: { fg: colors.success, bg: colors.successBg } },
  medium: { label: 'Orta', tone: { fg: colors.info, bg: colors.infoBg } },
  high: { label: 'Yüksek', tone: { fg: colors.danger, bg: colors.dangerBg } },
};

// Durum (status): open=amber, in_progress=mavi, closed=gri — web ile aynı.
export const STATUS_META: Record<Status, { label: string; tone: Tone }> = {
  open: { label: 'Açık', tone: { fg: colors.warn, bg: colors.warnBg } },
  in_progress: { label: 'İşlemde', tone: { fg: colors.info, bg: colors.infoBg } },
  closed: { label: 'Kapalı', tone: { fg: colors.secondary, bg: colors.secondaryBg } },
};

export const PRIORITY_VALUES: Priority[] = ['low', 'medium', 'high'];
export const STATUS_VALUES: Status[] = ['open', 'in_progress', 'closed'];

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Backend SlaInfo'sundan web'deki SlaBadge ile aynı durumu türetir.
export function slaState(ticket: {
  escalated?: boolean;
  status: Status;
  sla?: { breached: boolean; resolutionRemainingMinutes: number | null; resolutionTargetMinutes: number };
}): { label: string; tone: Tone } | null {
  if (ticket.escalated) return { label: 'Yükseltildi', tone: { fg: colors.danger, bg: colors.dangerBg } };
  const sla = ticket.sla;
  if (!sla || ticket.status === 'closed') return null;
  if (sla.breached) return { label: 'Gecikti', tone: { fg: colors.danger, bg: colors.dangerBg } };
  const rem = sla.resolutionRemainingMinutes;
  if (rem != null && rem > 0 && rem < 0.2 * sla.resolutionTargetMinutes) {
    return { label: 'Yakında doluyor', tone: { fg: colors.warn, bg: colors.warnBg } };
  }
  return null;
}
