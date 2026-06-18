import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSla, updateSla, type SlaTargets } from '@/api/sla';
import { extractErrorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Banner, Button, Card, TextField } from '@/components/ui';
import { colors, PRIORITY_META } from '@/theme';
import type { Priority } from '@/types';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

function hint(mins: number): string {
  if (!mins || mins < 60) return `${mins || 0} dk`;
  const h = mins / 60;
  return Number.isInteger(h) ? `${h} saat` : `${h.toFixed(1)} saat`;
}

export default function SlaScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['sla'], queryFn: getSla });
  const [draft, setDraft] = useState<SlaTargets | null>(null);

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  const saveMut = useMutation({
    mutationFn: () => updateSla(draft!),
    onSuccess: async () => {
      toast({ text: 'SLA hedefleri kaydedildi' });
      await qc.invalidateQueries({ queryKey: ['sla'] });
    },
    onError: (e) => toast({ text: extractErrorMessage(e) }),
  });

  function setField(p: Priority, key: 'response' | 'resolution', value: string) {
    const n = Math.max(0, parseInt(value.replace(/[^0-9]/g, ''), 10) || 0);
    setDraft((d) => (d ? { ...d, [p]: { ...d[p], [key]: n } } : d));
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'SLA Ayarları' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Öncelik bazında ilk yanıt ve çözüm hedefleri (dakika). SLA rozetleri ve uyum oranları bu değerlere göre hesaplanır.
        </Text>

        {query.isError ? <Banner text={extractErrorMessage(query.error)} /> : null}
        {!draft ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            {PRIORITIES.map((p) => {
              const meta = PRIORITY_META[p];
              return (
                <Card key={p} style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={[styles.priorityDot, { backgroundColor: meta.tone.fg }]} />
                    <Text style={styles.priorityLabel}>{meta.label} öncelik</Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldCol}>
                      <TextField
                        label="İlk yanıt (dk)"
                        value={String(draft[p].response)}
                        onChangeText={(t) => setField(p, 'response', t)}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.hint}>{hint(draft[p].response)}</Text>
                    </View>
                    <View style={styles.fieldCol}>
                      <TextField
                        label="Çözüm (dk)"
                        value={String(draft[p].resolution)}
                        onChangeText={(t) => setField(p, 'resolution', t)}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.hint}>{hint(draft[p].resolution)}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
            <Button title="Kaydet" onPress={() => saveMut.mutate()} loading={saveMut.isPending} style={styles.saveBtn} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 14 },
  card: { marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  priorityLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldCol: { flex: 1 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: -6, marginBottom: 4 },
  saveBtn: { marginTop: 6 },
});
