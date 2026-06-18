import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  exportByEmail,
  getJobStats,
  type ExportEntity,
  type ExportFormat,
} from '@/api/operations';
import { extractErrorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Banner, Button, Card } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { colors, shadow } from '@/theme';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
];

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={18} color={tone} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function OperationsScreen() {
  const toast = useToast();
  const [entity, setEntity] = useState<ExportEntity>('tickets');
  const query = useQuery({ queryKey: ['job-stats'], queryFn: getJobStats, refetchInterval: 10_000 });
  const stats = query.data?.stats;
  const recent = query.data?.recent ?? [];

  const exportMut = useMutation({
    mutationFn: (format: ExportFormat) => exportByEmail(entity, format),
    onSuccess: () => toast({ text: 'Dışa aktarım kuyruğa alındı — e-posta ile gelecek.' }),
    onError: (e) => toast({ text: extractErrorMessage(e) }),
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Operasyonlar' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {query.isError ? <Banner text={extractErrorMessage(query.error)} /> : null}

        <Text style={styles.section}>İş kuyruğu</Text>
        <View style={styles.statRow}>
          <Stat label="Aktif" value={stats?.active ?? 0} icon="sync-outline" tone={colors.primary} />
          <Stat label="Bekleyen" value={stats?.waiting ?? 0} icon="hourglass-outline" tone={colors.warn} />
        </View>
        <View style={styles.statRow}>
          <Stat label="Tamamlanan" value={stats?.completed ?? 0} icon="checkmark-circle-outline" tone={colors.success} />
          <Stat label="Başarısız" value={stats?.failed ?? 0} icon="close-circle-outline" tone={colors.danger} />
        </View>

        <Text style={styles.section}>Dışa aktar (e-posta ile)</Text>
        <Card>
          <Text style={styles.label}>Veri türü</Text>
          <View style={styles.entityRow}>
            {(['tickets', 'users'] as ExportEntity[]).map((e) => (
              <Button
                key={e}
                title={e === 'tickets' ? 'Talepler' : 'Kullanıcılar'}
                variant={entity === e ? 'primary' : 'secondary'}
                onPress={() => setEntity(e)}
                style={styles.entityBtn}
              />
            ))}
          </View>
          <Text style={styles.label}>Biçim</Text>
          <View style={styles.formatRow}>
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                title={f.label}
                variant="secondary"
                icon="download-outline"
                onPress={() => exportMut.mutate(f.value)}
                loading={exportMut.isPending && exportMut.variables === f.value}
                style={styles.formatBtn}
              />
            ))}
          </View>
          <Text style={styles.hint}>Seçilen veri arka planda hazırlanıp e-posta ile gönderilir.</Text>
        </Card>

        {recent.length ? (
          <>
            <Text style={styles.section}>Son işlemler</Text>
            {recent.map((op) => (
              <Card key={op.id} style={styles.opCard}>
                <View style={styles.opTop}>
                  <Text style={styles.opName}>{op.name}</Text>
                  <Icon
                    name={op.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={op.status === 'completed' ? colors.success : colors.danger}
                  />
                </View>
                {op.summary ? <Text style={styles.opSummary}>{op.summary}</Text> : null}
              </Card>
            ))}
          </>
        ) : null}

        <Text style={styles.note}>
          Toplu içe aktarım (CSV/Excel yükleme) yakında mobile eklenecek; şimdilik web panelinden yapılabilir.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow.sm,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
  entityRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  entityBtn: { flex: 1 },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatBtn: { flex: 1 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 12 },
  opCard: { marginBottom: 10 },
  opTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  opName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  opSummary: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 20, lineHeight: 18, fontStyle: 'italic' },
});
