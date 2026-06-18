import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { createTicket } from '@/api/tickets';
import { useToast } from '@/components/Toast';
import type { CreateTicketPayload } from '@/types';

// Çevrimdışı-öncelikli kuyruk: internet yokken oluşturulan talepler yerelde
// (AsyncStorage) saklanır; bağlantı gelince otomatik senkronlanır.
const KEY = 'offline_queue_v1';

interface QueuedTicket {
  id: string;
  payload: CreateTicketPayload;
  createdAt: number;
}

async function readQueue(): Promise<QueuedTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedTicket[]) : [];
  } catch {
    return [];
  }
}
async function writeQueue(q: QueuedTicket[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

interface OfflineState {
  online: boolean;
  pending: number;
  queueTicket: (p: CreateTicketPayload) => Promise<void>;
  flush: () => Promise<void>;
}
const Ctx = createContext<OfflineState>({
  online: true,
  pending: 0,
  queueTicket: async () => {},
  flush: async () => {},
});
export const useOffline = () => useContext(Ctx);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const flushing = useRef(false);

  const refreshCount = useCallback(async () => {
    setPending((await readQueue()).length);
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let q = await readQueue();
      if (!q.length) return;
      let synced = 0;
      for (const item of [...q]) {
        try {
          await createTicket(item.payload);
          synced += 1;
          q = q.filter((x) => x.id !== item.id);
          await writeQueue(q);
        } catch {
          break; // bağlantı yine koptu → kalanı bir sonraki sefere
        }
      }
      await refreshCount();
      if (synced > 0) {
        await qc.invalidateQueries({ queryKey: ['tickets'] });
        toast({ text: `${synced} çevrimdışı talep senkronlandı ✓` });
      }
    } finally {
      flushing.current = false;
    }
  }, [qc, toast, refreshCount]);

  const queueTicket = useCallback(
    async (p: CreateTicketPayload) => {
      const q = await readQueue();
      q.push({ id: `local-${Date.now()}`, payload: p, createdAt: Date.now() });
      await writeQueue(q);
      await refreshCount();
    },
    [refreshCount],
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await refreshCount();
      try {
        const st = await Network.getNetworkStateAsync();
        if (mounted) setOnline(!!st.isConnected && st.isInternetReachable !== false);
      } catch {
        /* ignore */
      }
    })();
    const sub = Network.addNetworkStateListener((state) => {
      const isOn = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(isOn);
      if (isOn) void flush();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [flush, refreshCount]);

  return <Ctx.Provider value={{ online, pending, queueTicket, flush }}>{children}</Ctx.Provider>;
}
