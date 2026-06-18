import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { socket, connectSocket, disconnectSocket } from './socket';
import { ensureNotificationPermission, presentLocalNotification } from '@/features/push';
import { useToast } from '@/components/Toast';

// Backend'in bildirim payload'ı: { type, ticketId, ticketSubject, ... }
interface NotificationPayload {
  type: 'reply' | 'created' | 'assigned' | 'status';
  ticketId: string;
  ticketSubject: string;
}

const NOTIF_TEXT: Record<NotificationPayload['type'], (s: string) => string> = {
  reply: (s) => `«${s}» talebinize yanıt geldi`,
  status: (s) => `«${s}» talebinin durumu güncellendi`,
  assigned: (s) => `«${s}» talebiniz bir temsilciye atandı`,
  created: (s) => `«${s}» talebi oluşturuldu`,
};

// Oturum açıkken socket'i bağlar; gelen olaylarda react-query önbelleğini tazeler
// (liste/detay CANLI güncellenir) ve kişisel bildirimde toast + haptik gösterir.
export function RealtimeBridge() {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    connectSocket();
    void ensureNotificationPermission();

    const invalidateList = () => void qc.invalidateQueries({ queryKey: ['tickets'] });
    const onUpdated = (p: { ticket?: { id?: string } }) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      if (p?.ticket?.id) void qc.invalidateQueries({ queryKey: ['ticket', p.ticket.id] });
    };
    const onNotification = (n: NotificationPayload) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['unread-count'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      if (n.ticketId) void qc.invalidateQueries({ queryKey: ['ticket', n.ticketId] });
      const text = (NOTIF_TEXT[n.type] ?? ((s: string) => `«${s}» güncellendi`))(n.ticketSubject || 'Talep');
      // Uygulama içi toast + cihaz bildirimi (push).
      toast({ text, onPress: n.ticketId ? () => router.push(`/ticket/${n.ticketId}`) : undefined });
      void presentLocalNotification('Destek Mobil', text, { ticketId: n.ticketId });
    };

    socket.on('ticket:created', invalidateList);
    socket.on('ticket:updated', onUpdated);
    socket.on('ticket:deleted', invalidateList);
    socket.on('notification', onNotification);

    return () => {
      socket.off('ticket:created', invalidateList);
      socket.off('ticket:updated', onUpdated);
      socket.off('ticket:deleted', invalidateList);
      socket.off('notification', onNotification);
      disconnectSocket();
    };
  }, [qc, router, toast]);

  return null;
}
