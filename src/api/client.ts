import axios, { AxiosError } from 'axios';
import { API_URL } from '@/config';
import { getToken } from '@/auth/secureStore';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// 401 alındığında AuthContext'in oturumu kapatması için kayıt edilen geri çağrı.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

// JWT mevcutsa her isteğe Authorization başlığı eklenir.
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → oturumu temizle (token süresi dolmuş ya da geçersiz).
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) onUnauthorized?.();
    return Promise.reject(error);
  },
);

// API hatasından okunabilir bir mesaj çıkarır (backend {error, details} döndürür).
export function extractErrorMessage(error: unknown, fallback = 'Bir hata oluştu'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: Record<string, string[]> } | undefined;
    if (data?.details) {
      const first = Object.values(data.details).flat().find(Boolean);
      if (first) return first;
    }
    if (data?.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'Sunucuya ulaşılamadı (zaman aşımı).';
    if (error.message === 'Network Error') return 'Sunucuya bağlanılamadı. API adresini kontrol edin.';
    if (error.message) return error.message;
  }
  return fallback;
}
