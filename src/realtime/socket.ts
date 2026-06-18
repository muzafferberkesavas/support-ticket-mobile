import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import { getToken } from '@/auth/secureStore';

// Web ile aynı Socket.IO sunucusuna bağlanır (backend/src/realtime/socket.ts).
// JWT, web'deki gibi handshake `auth` payload'ı ile gönderilir (header değil).
// API_URL bir yol öneki içerebilir (ör. k3s ingress'te http://192.168.64.3/api).
// Bu durumda origin ile öneki ayırıp Socket.IO path'ini "<önek>/socket.io" yaparız;
// öneksiz (docker http://host:3100) durumda path varsayılan "/socket.io" olur.
const _m = API_URL.match(/^(https?:\/\/[^/]+)(\/.*)?$/);
const SOCKET_ORIGIN = _m ? _m[1] : API_URL;
const SOCKET_PATH = `${_m && _m[2] ? _m[2].replace(/\/+$/, '') : ''}/socket.io`;

export const socket: Socket = io(SOCKET_ORIGIN, {
  path: SOCKET_PATH,
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
