import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import { extractErrorMessage } from '@/api/client';
import { Banner, EmptyState } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { colors, formatDateTime, shadow } from '@/theme';
import type { AppNotification } from '@/types';

const META: Record<AppNotification['type'], { icon: IconName; tone: string; text: (n: AppNotification) => string }> = {
  reply: { icon: 'chatbubble-ellipses', tone: colors.primary, text: (n) => (n.actor ? `${n.actor} yanıt verdi` : 'Talebinize yeni yanıt') },
  created: { icon: 'add-circle', tone: colors.success, text: () => 'Talebiniz oluşturuldu' },
  assigned: { icon: 'person-add', tone: colors.info, text: () => 'Bir talebe atandınız' },
  status: { icon: 'swap-horizontal', tone: colors.warn, text: () => 'Talep durumu değişti' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const items = query.data?.notifications ?? [];
  const unread = query.data?.unreadCount ?? 0;

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const readMut = useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: refresh });
  const allMut = useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: refresh });

  function open(n: AppNotification) {
    if (!n.read) readMut.mutate(n.id);
    if (n.ticketId) router.push(`/ticket/${n.ticketId}`);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Bildirimler',
          headerRight: () =>
            unread > 0 ? (
              <Pressable onPress={() => allMut.mutate()} hitSlop={8}>
                <Text style={styles.headerAction}>Tümü okundu</Text>
              </Pressable>
            ) : null,
        }}
      />

      {query.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(query.error)} /></View> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {items.length === 0 && !query.isLoading ? (
          <EmptyState title="Bildirim yok" subtitle="Yeni bir şey olduğunda burada görürsünüz." icon="notifications-outline" />
        ) : null}
        {items.map((n) => {
          const m = META[n.type];
          return (
            <Pressable
              key={n.id}
              onPress={() => open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.rowUnread, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: m.tone + '1f' }]}>
                <Icon name={m.icon} size={20} color={m.tone} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.title}>{m.text(n)}</Text>
                <Text style={styles.subject} numberOfLines={1}>{n.ticketSubject}</Text>
                <Text style={styles.time}>{formatDateTime(n.createdAt)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16 },
  flex1: { flex: 1 },
  headerAction: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadow.sm,
  },
  rowUnread: { borderColor: colors.primarySoft, backgroundColor: '#fbfbff' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  subject: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
