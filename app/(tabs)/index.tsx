import React, { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listTickets } from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { Banner, EmptyState } from '@/components/ui';
import { TicketCard } from '@/components/ticket';
import { captureLocation, haversineKm, parseGeo } from '@/features/geo';
import { colors, PRIORITY_META, PRIORITY_VALUES, STATUS_META, STATUS_VALUES } from '@/theme';
import type { Priority, Status, TicketFilters } from '@/types';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | undefined>();
  const [priority, setPriority] = useState<Priority | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [nearby, setNearby] = useState(false);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyBusy, setNearbyBusy] = useState(false);

  const filters: TicketFilters = { status, priority, search: search || undefined };
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
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/scan')} hitSlop={10}>
                <Text style={styles.headerIcon}>📷</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/profile')} hitSlop={10}>
                <Text style={styles.headerIcon}>👤</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/new')} hitSlop={10}>
                <Text style={styles.headerPlus}>＋</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Arama */}
      <View style={styles.searchRow}>
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
            <Text style={styles.clear}>✕</Text>
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
        <Chip label={nearbyBusy ? 'Konum…' : '📍 Yakındakiler'} active={nearby} onPress={toggleNearby} />
      </ScrollView>

      {query.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(query.error)} /></View> : null}

      <FlatList
        data={displayed}
        keyExtractor={(x) => x.t.id}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item.t}
            distanceKm={item.d}
            onPress={() => router.push(`/ticket/${item.t.id}`)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIcon: { fontSize: 20 },
  headerPlus: { fontSize: 28, color: colors.primary, fontWeight: '600', lineHeight: 30 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  search: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  clear: { color: colors.textMuted, fontSize: 16, paddingLeft: 8 },
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
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  pad: { paddingHorizontal: 16 },
});
