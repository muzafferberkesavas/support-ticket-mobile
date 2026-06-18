import React, { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkTickets, listTickets } from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { Banner, Button, EmptyState } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { TicketCard } from '@/components/ticket';
import { useAuth } from '@/auth/AuthContext';
import { captureLocation, haversineKm, parseGeo } from '@/features/geo';
import { colors, shadow, PRIORITY_META, PRIORITY_VALUES, STATUS_META, STATUS_VALUES } from '@/theme';
import type { Priority, Status, TicketFilters, TicketScope } from '@/types';

function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <View style={styles.chipRow}>
        {icon ? <Icon name={icon} size={13} color={active ? colors.white : colors.textMuted} /> : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const SCOPE_OPTIONS: { value: TicketScope; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'mine', label: 'Bana' },
  { value: 'unassigned', label: 'Atanmamış' },
];

export default function TicketsScreen() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const [status, setStatus] = useState<Status | undefined>();
  const [priority, setPriority] = useState<Priority | undefined>();
  const [scope, setScope] = useState<TicketScope>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [nearby, setNearby] = useState(false);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const qc = useQueryClient();

  const bulkMut = useMutation({
    mutationFn: (v: { action: 'status' | 'delete'; status?: Status }) =>
      bulkTickets(selectedIds, v.action, v.status ? { status: v.status } : undefined),
    onSuccess: async () => {
      setSelectMode(false);
      setSelectedIds([]);
      await qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  function toggleSelect(ticketId: string) {
    setSelectedIds((prev) => (prev.includes(ticketId) ? prev.filter((x) => x !== ticketId) : [...prev, ticketId]));
  }
  function exitSelect() {
    setSelectMode(false);
    setSelectedIds([]);
  }
  function bulkStatus() {
    Alert.alert('Durumu değiştir', `${selectedIds.length} talep güncellenecek`, [
      ...STATUS_VALUES.map((s) => ({ text: STATUS_META[s].label, onPress: () => bulkMut.mutate({ action: 'status', status: s }) })),
      { text: 'Vazgeç', style: 'cancel' as const },
    ]);
  }
  function bulkDelete() {
    Alert.alert('Talepleri sil', `${selectedIds.length} talep kalıcı olarak silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => bulkMut.mutate({ action: 'delete' }) },
    ]);
  }

  const filters: TicketFilters = {
    status,
    priority,
    search: search || undefined,
    scope: isStaff ? scope : undefined,
  };
  const query = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => listTickets(filters),
  });

  const tickets = query.data ?? [];

  // "Yakındakiler": konum etiketli talepleri, mevcut konuma olan mesafeye göre sıralar/filtreler.
  const displayed = useMemo(() => {
    if (!nearby || !myLoc) return tickets.map((t) => ({ t, d: null as number | null }));
    return tickets
      .map((t) => {
        const g = parseGeo(t.tags);
        return { t, d: g ? haversineKm(myLoc, g) : null };
      })
      .filter((x) => x.d != null)
      .sort((a, b) => (a.d as number) - (b.d as number));
  }, [tickets, nearby, myLoc]);

  async function toggleNearby() {
    if (nearby) return setNearby(false);
    setNearbyBusy(true);
    try {
      const loc = myLoc ?? (await captureLocation());
      setMyLoc({ lat: loc.lat, lng: loc.lng });
      setNearby(true);
    } catch (e) {
      Alert.alert('Konum', e instanceof Error ? e.message : 'Konum alınamadı.');
    } finally {
      setNearbyBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Arama */}
      <View style={styles.searchRow}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Konu, mesaj veya kategori ara…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(searchInput.trim())}
        />
        {searchInput ? (
          <Pressable
            onPress={() => {
              setSearchInput('');
              setSearch('');
            }}
            hitSlop={10}
          >
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filtre çipleri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {isStaff
          ? SCOPE_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={scope === o.value} onPress={() => setScope(o.value)} />
            ))
          : null}
        {isStaff ? <View style={styles.divider} /> : null}
        {STATUS_VALUES.map((s) => (
          <Chip
            key={s}
            label={STATUS_META[s].label}
            active={status === s}
            onPress={() => setStatus(status === s ? undefined : s)}
          />
        ))}
        <View style={styles.divider} />
        {PRIORITY_VALUES.map((p) => (
          <Chip
            key={p}
            label={PRIORITY_META[p].label}
            active={priority === p}
            onPress={() => setPriority(priority === p ? undefined : p)}
          />
        ))}
        <View style={styles.divider} />
        <Chip label={nearbyBusy ? 'Konum…' : 'Yakındakiler'} icon="location" active={nearby} onPress={toggleNearby} />
        {isStaff && !selectMode ? (
          <Chip label="Seç" icon="checkbox-outline" active={false} onPress={() => setSelectMode(true)} />
        ) : null}
      </ScrollView>

      {query.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(query.error)} /></View> : null}

      <FlatList
        data={displayed}
        keyExtractor={(x) => x.t.id}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item.t}
            distanceKm={item.d}
            showRequester={isStaff}
            selectMode={selectMode}
            selected={selectedIds.includes(item.t.id)}
            onPress={() => (selectMode ? toggleSelect(item.t.id) : router.push(`/ticket/${item.t.id}`))}
            onLongPress={
              isStaff
                ? () => {
                    setSelectMode(true);
                    toggleSelect(item.t.id);
                  }
                : undefined
            }
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        ListEmptyComponent={
          query.isLoading ? null : (
            <EmptyState
              title={nearby ? 'Yakında konumlu talep yok' : 'Talep bulunamadı'}
              subtitle={
                nearby
                  ? 'Konum etiketli talebiniz yok ya da hepsi uzakta. Yeni talepte “Konumu Ekle” ile konum ekleyebilirsiniz.'
                  : status || priority || search
                    ? 'Filtreleri değiştirmeyi deneyin.'
                    : 'Sağ üstteki ＋ ile ilk talebinizi oluşturun.'
              }
            />
          )
        }
      />

      {selectMode ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedIds.length} seçili</Text>
          <View style={styles.selectActions}>
            <Button title="Durum" variant="secondary" icon="swap-vertical" onPress={bulkStatus} disabled={!selectedIds.length || bulkMut.isPending} style={styles.selectBtn} />
            <Button title="Sil" variant="danger" icon="trash-outline" onPress={bulkDelete} disabled={!selectedIds.length || bulkMut.isPending} style={styles.selectBtn} />
            <Button title="Vazgeç" variant="ghost" onPress={exitSelect} style={styles.selectBtn} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  connDot: { width: 9, height: 9, borderRadius: 5 },
  connOn: { backgroundColor: colors.success },
  connOff: { backgroundColor: colors.secondary },
  headerIcon: { fontSize: 20 },
  headerPlus: { fontSize: 28, color: colors.primary, fontWeight: '600', lineHeight: 30 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    ...shadow.sm,
  },
  search: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  filterScroll: { maxHeight: 44, marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  divider: { width: 1, height: 22, backgroundColor: colors.border, marginHorizontal: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  pad: { paddingHorizontal: 16 },
  selectBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    ...shadow.md,
  },
  selectCount: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  selectActions: { flexDirection: 'row', gap: 10 },
  selectBtn: { flex: 1 },
});
