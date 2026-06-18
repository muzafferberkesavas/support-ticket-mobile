import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TicketForm, TicketFormValues } from '@/components/TicketForm';
import { createTicket } from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { useOffline } from '@/offline/OfflineContext';
import { useToast } from '@/components/Toast';
import { colors } from '@/theme';
import type { CreateTicketPayload } from '@/types';

const toPayload = (v: TicketFormValues): CreateTicketPayload => ({
  subject: v.subject,
  message: v.message,
  priority: v.priority,
  category: v.category.trim() || null,
  tags: v.tags,
});

export default function NewTicketScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { online, queueTicket } = useOffline();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (v: TicketFormValues) => createTicket(toPayload(v)),
    onSuccess: async (ticket) => {
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      router.replace(`/ticket/${ticket.id}`);
    },
    onError: (e) => setError(extractErrorMessage(e, 'Talep oluşturulamadı.')),
  });

  function handleSubmit(v: TicketFormValues) {
    setError(null);
    // Çevrimdışıysa kuyruğa al → bağlanınca otomatik senkronlanır.
    if (!online) {
      void queueTicket(toPayload(v)).then(() => {
        toast({ text: 'Çevrimdışısınız — talep kuyruğa alındı, bağlanınca gönderilecek.' });
        router.replace('/');
      });
      return;
    }
    mutation.mutate(v);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TicketForm
          submitLabel={online ? 'Talebi Oluştur' : 'Çevrimdışı Kuyruğa Al'}
          loading={mutation.isPending}
          error={error}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16 },
});
