import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAnalytics, type Analytics } from '@/api/analytics';
import { extractErrorMessage } from '@/api/client';
import { ROLE_LABELS } from '@/auth/roles';
import { Badge, Banner, Button, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  colors,
  shadow,
  PRIORITY_META,
  PRIORITY_VALUES,
  STATUS_META,
  STATUS_VALUES,
} from '@/theme';

function fmtMin(n: number | null): string {
  if (n == null) return '—';
  if (n < 60) return `${Math.round(n)} dk`;
  return `${(n / 60).toFixed(1)} sa`;
}
const pct = (n: number | null) => (n == null ? '—' : `%${n}`);

function Kpi({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ComponentProps<typeof Icon>['name'] }) {
  return (
    <View style={styles.kpi}>
      <Icon name={icon} size={18} color={tone} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function BarRow({ label, count, max, tone }: { label: string; count: number; max: number; tone: string }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(2, (count / max) * 100)}%`, backgroundColor: tone }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

export default function AnalyticsScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['analytics'], queryFn: () => getAnalytics() });
  const a: Analytics | undefined = query.data;

  const reanalyzeMut = useMutation({
    mutationFn: () => getAnalytics({ refresh: true }),
    onSuccess: (data) => qc.setQueryData(['analytics'], data),
  });

  const deptMax = a ? Math.max(1, ...a.byDepartment.map((d) => d.count)) : 1;
  const statusMax = a ? Math.max(1, ...STATUS_VALUES.map((s) => a.byStatus[s] ?? 0)) : 1;
  const prioMax = a ? Math.max(1, ...PRIORITY_VALUES.map((p) => a.byPriority[p] ?? 0)) : 1;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Analitik' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {query.isError ? <Banner text={extractErrorMessage(query.error)} /> : null}

        {a ? (
          <>
            {a.scope === 'departments' ? (
              <Text style={styles.scopeNote}>Departmanlarınıza ait veriler gösteriliyor.</Text>
            ) : null}

            {/* KPI ızgarası */}
            <View style={styles.kpiGrid}>
              <Kpi label="Toplam talep" value={String(a.summary.total)} tone={colors.primary} icon="reader-outline" />
              <Kpi label="Atanmamış" value={String(a.summary.unassigned)} tone={colors.warn} icon="help-circle-outline" />
              <Kpi label="Yükseltilen" value={String(a.summary.escalated)} tone={colors.danger} icon="arrow-up-circle-outline" />
              <Kpi label="Ort. ilk yanıt" value={fmtMin(a.summary.avgFirstResponseMinutes)} tone={colors.info} icon="time-outline" />
              <Kpi label="Ort. çözüm" value={fmtMin(a.summary.avgResolutionMinutes)} tone={colors.info} icon="checkmark-done-outline" />
              <Kpi label="SLA yanıt" value={pct(a.summary.slaResponseCompliance)} tone={colors.success} icon="speedometer-outline" />
              <Kpi label="SLA çözüm" value={pct(a.summary.slaResolutionCompliance)} tone={colors.success} icon="shield-checkmark-outline" />
              <Kpi
                label={`CSAT (${a.summary.csatCount})`}
                value={a.summary.csatAverage != null ? `${a.summary.csatAverage.toFixed(1)}★` : '—'}
                tone={colors.warn}
                icon="star-outline"
              />
            </View>

            <Section title="Duruma göre">
              {STATUS_VALUES.map((s) => (
                <BarRow key={s} label={STATUS_META[s].label} count={a.byStatus[s] ?? 0} max={statusMax} tone={STATUS_META[s].tone.fg} />
              ))}
            </Section>

            <Section title="Önceliğe göre">
              {PRIORITY_VALUES.map((p) => (
                <BarRow key={p} label={PRIORITY_META[p].label} count={a.byPriority[p] ?? 0} max={prioMax} tone={PRIORITY_META[p].tone.fg} />
              ))}
            </Section>

            {a.byDepartment.length ? (
              <Section title="Departmana göre">
                {a.byDepartment.slice(0, 6).map((d) => (
                  <BarRow key={d.departmentId ?? 'none'} label={d.name ?? 'Departmansız'} count={d.count} max={deptMax} tone={colors.primary} />
                ))}
              </Section>
            ) : null}

            {a.agentPerformance.length ? (
              <Section title="Temsilci performansı">
                {a.agentPerformance.map((ag) => (
                  <View key={ag.userId} style={styles.agentRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.agentName}>{ag.name}</Text>
                      <Text style={styles.agentRole}>{ROLE_LABELS[ag.role]}</Text>
                    </View>
                    <View style={styles.agentStats}>
                      <Text style={styles.agentStat}>{ag.assigned} atanan</Text>
                      <Text style={styles.agentStat}>{ag.resolved} çözülen</Text>
                      <Text style={styles.agentStatMuted}>{fmtMin(ag.avgFirstResponseMinutes)}</Text>
                    </View>
                  </View>
                ))}
              </Section>
            ) : null}

            {/* Tekrar eden problemler (Claude) */}
            <View style={styles.recurHead}>
              <Text style={styles.sectionTitle}>Tekrar eden problemler</Text>
              <Button
                title="Yeniden Analiz"
                variant="secondary"
                icon="sparkles-outline"
                onPress={() => reanalyzeMut.mutate()}
                loading={reanalyzeMut.isPending}
                style={styles.reBtn}
              />
            </View>
            {a.recurringMeta ? (
              <Text style={styles.metaLine}>
                {a.recurringMeta.provider === 'anthropic' ? 'Claude (Anthropic)' : 'Yerel NLP'} ·{' '}
                {a.recurringMeta.cached ? 'önbellekten' : 'taze'}
              </Text>
            ) : null}
            {a.recurringProblems.length === 0 ? (
              <Text style={styles.empty}>Tekrar eden tema bulunamadı.</Text>
            ) : (
              a.recurringProblems.map((t) => (
                <Card key={t.term} style={styles.recurCard}>
                  <View style={styles.recurTop}>
                    <Text style={styles.recurTerm}>{t.term}</Text>
                    <Badge label={`${t.count}×`} fg={colors.primary} bg={colors.primarySoft} />
                  </View>
                  <Text style={styles.recurMeta}>{t.distinctRequesters} farklı kişi</Text>
                  {t.suggestion ? <Text style={styles.recurSuggestion}>{t.suggestion}</Text> : null}
                </Card>
              ))
            )}
          </>
        ) : query.isLoading ? null : (
          <Text style={styles.empty}>Veri yok.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  scopeNote: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  flex1: { flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    ...shadow.sm,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 },
  kpiLabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  barLabel: { width: 78, fontSize: 12, color: colors.textMuted },
  barTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 9, borderRadius: 5 },
  barCount: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.text },
  agentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  agentName: { fontSize: 14, fontWeight: '600', color: colors.text },
  agentRole: { fontSize: 12, color: colors.textMuted },
  agentStats: { alignItems: 'flex-end' },
  agentStat: { fontSize: 12, color: colors.text, fontWeight: '600' },
  agentStatMuted: { fontSize: 11, color: colors.textMuted },
  recurHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 4 },
  reBtn: { paddingHorizontal: 12, height: 40 },
  metaLine: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  recurCard: { marginBottom: 10 },
  recurTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recurTerm: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  recurMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  recurSuggestion: { fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 19 },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 10 },
});
