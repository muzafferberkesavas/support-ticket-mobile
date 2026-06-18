import { Appearance } from 'react-native';
import type { Priority, Status } from '@/types';

// Her iki temada ortak marka/aksiyon renkleri (indigo/mor — BrandLogo gradyanı).
const ACCENTS = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  brand1: '#6366f1',
  brand2: '#7c3aed',
  brand3: '#4338ca',
  white: '#ffffff',
};

// Açık tema — web arayüzüyle (PrimeVue indigo) tutarlı.
const light = {
  ...ACCENTS,
  bg: '#f3f4fb',
  surface: '#ffffff',
  surfaceAlt: '#f8f9fd',
  surfaceHover: '#f1f2f9',
  border: '#e8eaf2',
  text: '#1f2433',
  textMuted: '#6b7280',
  primarySoft: '#eef2ff',
  success: '#16a34a',
  successBg: '#dcfce7',
  info: '#2563eb',
  infoBg: '#dbeafe',
  warn: '#d97706',
  warnBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  secondary: '#64748b',
  secondaryBg: '#eef0f6',
};

// Koyu tema — web'in .app-dark moduyla aynı ruh (koyu zemin, parlak aksanlar).
const dark: typeof light = {
  ...ACCENTS,
  bg: '#0e1016',
  surface: '#181b24',
  surfaceAlt: '#1e222d',
  surfaceHover: '#262b38',
  border: '#2b3140',
  text: '#e9ebf2',
  textMuted: '#99a1b3',
  primarySoft: '#23263b',
  success: '#34d399',
  successBg: '#0f2a1e',
  info: '#60a5fa',
  infoBg: '#12243d',
  warn: '#fbbf24',
  warnBg: '#2c2410',
  danger: '#f87171',
  dangerBg: '#2c1618',
  secondary: '#94a3b8',
  secondaryBg: '#222838',
};

export type Scheme = 'light' | 'dark';
// Aktif tema, uygulama açılışında cihaz/OS temasından belirlenir. OS teması
// değişince RootLayout bir Appearance dinleyicisiyle uygulamayı yeniden yükler.
export const scheme: Scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
export const isDark = scheme === 'dark';

// Tüm ekranlar bu paleti kullanır (StyleSheet'ler modül yükleminde okur).
export const colors: typeof light = isDark ? dark : light;

// Tutarlı yükselti/gölge (iOS shadow + Android elevation).
export const shadow = {
  sm: {
    shadowColor: '#1f2433',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#312e81',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

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
