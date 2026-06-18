import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '@/theme';

export interface SelectOption {
  id: string;
  label: string;
  sub?: string;
}

// Onay kutulu çoklu seçim listesi (departman üyeleri, kullanıcı departmanları vb.).
export function SelectList({
  options,
  selected,
  onToggle,
  empty,
}: {
  options: SelectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  empty?: string;
}) {
  if (!options.length) return <Text style={styles.empty}>{empty ?? 'Seçenek yok.'}</Text>;
  return (
    <View>
      {options.map((o) => {
        const sel = selected.includes(o.id);
        return (
          <Pressable key={o.id} onPress={() => onToggle(o.id)} style={styles.row}>
            <Icon name={sel ? 'checkbox' : 'square-outline'} size={20} color={sel ? colors.primary : colors.textMuted} />
            <View style={styles.flex1}>
              <Text style={styles.label}>{o.label}</Text>
              {o.sub ? <Text style={styles.sub}>{o.sub}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  flex1: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
});
