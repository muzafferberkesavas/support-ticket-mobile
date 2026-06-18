import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/api/dashboard';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Banner, EmptyState } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { TicketCard } from '@/components/ticket';
import { colors, shadow } from '@/theme';
import type { Ticket } from '@/types';

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: tone + '22' }]}>
        <Icon name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const d = query.data;

  const section = (title: string, icon: IconName, tone: string, items: Ticket[], empty: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={16} color={tone} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        items.map((t) => <TicketCard key={t.id} ticket={t} onPress={() => router.push(`/ticket/${t.id}`)} />)
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
    >
      <Text style={styles.greeting}>Merhaba, {user?.fullName || user?.email?.split('@')[0]} 👋</Text>
      <Text style={styles.subtitle}>Bugünün özeti</Text>

      {query.isError ? <Banner text={extractErrorMessage(query.error)} /> : null}

      {d ? (
        <>
          <View style={styles.kpiRow}>
            <Kpi label="Bana açık" value={d.counts.myOpen} icon="folder-open-outline" tone={colors.info} />
            <Kpi label="SLA riski" value={d.counts.slaRisk} icon="alert-circle-outline" tone={colors.danger} />
          </View>
          <View style={styles.kpiRow}>
            <Kpi label="Atanmamış" value={d.counts.unassigned} icon="help-circle-outline" tone={colors.warn} />
            <Kpi label="Bugün çözülen" value={d.counts.resolvedToday} icon="checkmark-done-outline" tone={colors.success} />
          </View>

          {section('SLA Riski', 'alert-circle', colors.danger, d.slaRisk, 'SLA riski olan talep yok.')}
          {section('Bana Açık', 'folder-open', colors.info, d.myOpen, 'Size atanmış açık talep yok.')}
          {section('Atanmamış', 'help-circle', colors.warn, d.unassigned, 'Atanmamış talep yok.')}
        </>
      ) : query.isLoading ? null : (
        <EmptyState title="Veri yok" subtitle="Panel verisi yüklenemedi." icon="speedometer-outline" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  greeting: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 14 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow.sm,
  },
  kpiIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 10 },
  kpiLabel: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  section: { marginTop: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 6 },
});
