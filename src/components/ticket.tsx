import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './ui';
import { colors, formatDateTime, PRIORITY_META, slaState, STATUS_META } from '@/theme';
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

export function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const replyCount = ticket._count?.replies ?? ticket.replies?.length ?? 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.badgeRow}>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <SlaBadge ticket={ticket} />
      </View>
      <Text style={styles.subject} numberOfLines={1}>
        {ticket.subject}
      </Text>
      <Text style={styles.message} numberOfLines={2}>
        {ticket.message}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>{formatDateTime(ticket.createdAt)}</Text>
        <View style={styles.footerRight}>
          {ticket.category ? <Text style={styles.meta}>· {ticket.category}</Text> : null}
          {replyCount > 0 ? <Text style={styles.meta}>· {replyCount} yanıt</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  subject: { fontSize: 16, fontWeight: '700', color: colors.text },
  message: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  footerRight: { flexDirection: 'row', gap: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
});
