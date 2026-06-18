import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import { getToken } from '@/auth/secureStore';

// Web ile aynı Socket.IO sunucusuna bağlanır (backend/src/realtime/socket.ts).
// JWT, web'deki gibi handshake `auth` payload'ı ile gönderilir (header değil).
// API_URL mobilde bir origin'dir (yol öneki içermez) → path varsayılan '/socket.io'.
export const socket: Socket = io(API_URL, {
  path: '/socket.io',
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: (cb) => {
    getToken()
      .then((t) => cb({ token: t ?? '' }))
      .catch(() => cb({ token: '' }));
  },
});

export function connectSocket(): void {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket(): void {
  if (socket.connected) socket.disconnect();
}

// ── Bağlantı durumu (liste başlığındaki canlı göstergesi için) ──────
let connected = socket.connected;
const subs = new Set<(v: boolean) => void>();
socket.on('connect', () => {
  connected = true;
  subs.forEach((s) => s(true));
});
socket.on('disconnect', () => {
  connected = false;
  subs.forEach((s) => s(false));
});

export function useSocketConnected(): boolean {
  const [c, setC] = useState(connected);
  useEffect(() => {
    subs.add(setC);
    setC(connected);
    return () => {
      subs.delete(setC);
    };
  }, []);
  return c;
}
