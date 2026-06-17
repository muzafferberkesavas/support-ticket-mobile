import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { TicketForm, TicketFormValues } from '@/components/TicketForm';
import { createTicket } from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { colors } from '@/theme';

export default function NewTicketScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (v: TicketFormValues) =>
      createTicket({
        subject: v.subject,
        message: v.message,
        priority: v.priority,
        category: v.category.trim() || null,
        tags: v.tags,
      }),
    onSuccess: async (ticket) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      router.replace(`/ticket/${ticket.id}`);
    },
    onError: (e) => setError(extractErrorMessage(e, 'Talep oluşturulamadı.')),
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TicketForm
          submitLabel="Talebi Oluştur"
          loading={mutation.isPending}
          error={error}
          onSubmit={(v) => {
            setError(null);
            mutation.mutate(v);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16 },
});
