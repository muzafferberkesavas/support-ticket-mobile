import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TicketForm, TicketFormValues } from '@/components/TicketForm';
import { getTicket, updateTicket } from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { Banner } from '@/components/ui';
import { colors } from '@/theme';

export default function EditTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['ticket', id], queryFn: () => getTicket(id) });

  const mutation = useMutation({
    // Son kullanıcı yalnızca içerik alanlarını düzenler (status/department backend'de staff'a özel).
    mutationFn: (v: TicketFormValues) =>
      updateTicket(id, {
        subject: v.subject,
        message: v.message,
        priority: v.priority,
        category: v.category.trim() || null,
        tags: v.tags,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ticket', id] });
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      router.back();
    },
    onError: (e) => setError(extractErrorMessage(e, 'Talep güncellenemedi.')),
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.container}>
        <Banner text={extractErrorMessage(query.error, 'Talep yüklenemedi.')} />
      </View>
    );
  }

  const t = query.data;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TicketForm
          submitLabel="Değişiklikleri Kaydet"
          loading={mutation.isPending}
          error={error}
          initial={{
            subject: t.subject,
            message: t.message,
            priority: t.priority,
            category: t.category ?? '',
            tags: t.tags ?? [],
          }}
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
  container: { padding: 16, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
