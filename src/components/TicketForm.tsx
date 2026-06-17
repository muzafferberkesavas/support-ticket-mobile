import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, TextField } from './ui';
import { colors, PRIORITY_META, PRIORITY_VALUES } from '@/theme';
import type { Priority } from '@/types';

export interface TicketFormValues {
  subject: string;
  message: string;
  priority: Priority;
  category: string;
  tags: string[];
}

const EMPTY: TicketFormValues = { subject: '', message: '', priority: 'medium', category: '', tags: [] };

// Backend create/update şemasıyla aynı doğrulama kuralları.
function validate(v: TicketFormValues): string | null {
  if (v.subject.trim().length < 3) return 'Konu en az 3 karakter olmalı.';
  if (v.subject.trim().length > 150) return 'Konu en fazla 150 karakter olabilir.';
  if (v.message.trim().length < 5) return 'Mesaj en az 5 karakter olmalı.';
  if (v.message.trim().length > 5000) return 'Mesaj en fazla 5000 karakter olabilir.';
  if (v.category.trim().length > 80) return 'Kategori en fazla 80 karakter olabilir.';
  if (v.tags.length > 15) return 'En fazla 15 etiket ekleyebilirsiniz.';
  if (v.tags.some((t) => t.length > 30)) return 'Her etiket en fazla 30 karakter olabilir.';
  return null;
}

export function TicketForm({
  initial,
  submitLabel,
  loading,
  error,
  onSubmit,
}: {
  initial?: Partial<TicketFormValues>;
  submitLabel: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (v: TicketFormValues) => void;
}) {
  const [values, setValues] = useState<TicketFormValues>({ ...EMPTY, ...initial });
  const [tagInput, setTagInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function set<K extends keyof TicketFormValues>(key: K, val: TicketFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!values.tags.includes(t) && values.tags.length < 15) set('tags', [...values.tags, t]);
    setTagInput('');
  }

  function submit() {
    const v = validate(values);
    if (v) return setLocalError(v);
    setLocalError(null);
    onSubmit({ ...values, subject: values.subject.trim(), message: values.message.trim() });
  }

  return (
    <View>
      {(localError || error) ? <Banner text={localError || error!} /> : null}

      <TextField
        label="Konu"
        value={values.subject}
        onChangeText={(t) => set('subject', t)}
        placeholder="Sorununuzu kısaca özetleyin"
        maxLength={150}
      />
      <TextField
        label="Mesaj"
        value={values.message}
        onChangeText={(t) => set('message', t)}
        placeholder="Detayları açıklayın"
        multiline
        maxLength={5000}
      />

      <Text style={styles.label}>Öncelik</Text>
      <View style={styles.segment}>
        {PRIORITY_VALUES.map((p) => {
          const active = values.priority === p;
          const m = PRIORITY_META[p];
          return (
            <Pressable
              key={p}
              onPress={() => set('priority', p)}
              style={[styles.segmentItem, active && { backgroundColor: m.tone.bg, borderColor: m.tone.fg }]}
            >
              <Text style={[styles.segmentText, active && { color: m.tone.fg }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Kategori (isteğe bağlı)"
        value={values.category}
        onChangeText={(t) => set('category', t)}
        placeholder="ör. Faturalama"
        maxLength={80}
      />

      <Text style={styles.label}>Etiketler (isteğe bağlı)</Text>
      <View style={styles.tagInputRow}>
        <TextField
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Etiket yazıp ekleyin"
          onSubmitEditing={addTag}
          returnKeyType="done"
          maxLength={30}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <Button title="Ekle" variant="secondary" onPress={addTag} style={styles.addTagBtn} />
      </View>
      {values.tags.length > 0 ? (
        <View style={styles.tagWrap}>
          {values.tags.map((t) => (
            <Pressable key={t} onPress={() => set('tags', values.tags.filter((x) => x !== t))} style={styles.tag}>
              <Text style={styles.tagText}>{t} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button title={submitLabel} onPress={submit} loading={loading} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  segmentText: { fontWeight: '600', color: colors.text },
  tagInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addTagBtn: { marginTop: 0, height: 48 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 },
  tag: { backgroundColor: colors.infoBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: colors.info, fontWeight: '600', fontSize: 13 },
});
