import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './ui';
import { Icon } from './Icon';
import { formatKm } from '@/features/geo';
import { colors, shadow, formatDateTime, PRIORITY_META, slaState, STATUS_META } from '@/theme';
import type { Ticket } from '@/types';

export function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  const m = PRIORITY_META[priority];
  return <Badge label={m.label} fg={m.tone.fg} bg={m.tone.bg} />;
}

export function StatusBadge({ status }: { status: Ticket['status'] }) {
  const m = STATUS_META[status];
  return <Badge label={m.label} fg={m.tone.fg} bg={m.tone.bg} />;
}

export function SlaBadge({ ticket }: { ticket: Ticket }) {
  const s = slaState(ticket);
  if (!s) return null;
  return <Badge label={s.label} fg={s.tone.fg} bg={s.tone.bg} />;
}

export function TicketCard({
  ticket,
  onPress,
  distanceKm,
  showRequester,
}: {
  ticket: Ticket;
  onPress: () => void;
  distanceKm?: number | null;
  showRequester?: boolean;
}) {
  const replyCount = ticket._count?.replies ?? ticket.replies?.length ?? 0;
  const assignees = ticket.assignees ?? [];
  const requesterName = ticket.user?.fullName || ticket.user?.email;
  const assigneeLabel = assignees.length
    ? assignees
        .slice(0, 2)
        .map((a) => a.user.fullName || a.user.email)
        .join(', ') + (assignees.length > 2 ? ` +${assignees.length - 2}` : '')
    : 'Atanmamış';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.badgeRow}>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <SlaBadge ticket={ticket} />
        {ticket.escalated ? <Badge label="Yükseltildi" fg="#b91c1c" bg="#fee2e2" /> : null}
      </View>
      <View style={styles.subjectRow}>
        <Text style={styles.subject} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Icon name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {ticket.message}
      </Text>
      {showRequester ? (
        <View style={styles.staffRow}>
          <View style={styles.footerItem}>
            <Icon name="person-outline" size={13} color={colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>{requesterName ?? '—'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Icon name="people-outline" size={13} color={assignees.length ? colors.primary : colors.textMuted} />
            <Text style={[styles.meta, !assignees.length && { color: colors.warn }]} numberOfLines={1}>
              {assigneeLabel}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Icon name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.meta}>{formatDateTime(ticket.createdAt)}</Text>
        </View>
        <View style={styles.footerRight}>
          {distanceKm != null ? (
            <View style={styles.footerItem}>
              <Icon name="location" size={13} color={colors.success} />
              <Text style={styles.distance}>{formatKm(distanceKm)}</Text>
            </View>
          ) : null}
          {ticket.category ? (
            <View style={styles.footerItem}>
              <Icon name="pricetag-outline" size={13} color={colors.textMuted} />
              <Text style={styles.meta}>{ticket.category}</Text>
            </View>
          ) : null}
          {replyCount > 0 ? (
            <View style={styles.footerItem}>
              <Icon name="chatbubble-outline" size={13} color={colors.textMuted} />
              <Text style={styles.meta}>{replyCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadow.sm,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  staffRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  message: { fontSize: 14, color: colors.textMuted, marginTop: 5, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  footerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
  distance: { fontSize: 12, color: colors.success, fontWeight: '700' },
});
