import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCanned, deleteCanned, listCanned, updateCanned, type CannedResponse } from '@/api/canned';
import { extractErrorMessage } from '@/api/client';
import { Banner, Button, Card, EmptyState, TextField } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

export default function CannedScreen() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['canned'], queryFn: listCanned });
  const items = query.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['canned'] });

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { title: title.trim(), body: body.trim() };
      return editing ? updateCanned(editing.id, payload) : createCanned(payload);
    },
    onSuccess: async () => {
      setModal(false);
      await invalidate();
    },
    onError: (e) => setErr(extractErrorMessage(e, 'Kaydedilemedi.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCanned(id),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setTitle('');
    setBody('');
    setErr(null);
    setModal(true);
  }
  function openEdit(c: CannedResponse) {
    setEditing(c);
    setTitle(c.title);
    setBody(c.body);
    setErr(null);
    setModal(true);
  }
  function confirmDelete(c: CannedResponse) {
    Alert.alert('Sil', `"${c.title}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMut.mutate(c.id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Hazır Yanıtlar',
          headerRight: () => (
            <Pressable onPress={openCreate} hitSlop={10}>
              <Icon name="add-circle" size={26} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {query.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(query.error)} /></View> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {items.length === 0 && !query.isLoading ? (
          <EmptyState title="Hazır yanıt yok" subtitle="Sık kullanılan yanıtları kaydedip hızlıca ekleyin." icon="chatbox-ellipses-outline" />
        ) : null}
        {items.map((c) => (
          <Card key={c.id} style={styles.card}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.body} numberOfLines={3}>{c.body}</Text>
            <View style={styles.actions}>
              <Button title="Düzenle" variant="secondary" icon="create-outline" onPress={() => openEdit(c)} style={styles.actionBtn} />
              <Button title="Sil" variant="danger" icon="trash-outline" onPress={() => confirmDelete(c)} style={styles.actionBtn} />
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editing ? 'Yanıtı Düzenle' : 'Yeni Hazır Yanıt'}</Text>
                <Pressable onPress={() => setModal(false)} hitSlop={10}>
                  <Icon name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
              {err ? <Banner text={err} /> : null}
              <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="ör. Karşılama" />
              <TextField
                label="İçerik"
                value={body}
                onChangeText={setBody}
                placeholder="Eklenecek metin…"
                multiline
                style={styles.bodyInput}
              />
              <Button
                title={editing ? 'Kaydet' : 'Oluştur'}
                onPress={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={!title.trim() || !body.trim()}
                style={styles.saveBtn}
              />
              <Button title="Vazgeç" variant="ghost" onPress={() => setModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16 },
  list: { padding: 16, flexGrow: 1 },
  card: { marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 5, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,18,30,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  bodyInput: { minHeight: 110, textAlignVertical: 'top' },
  saveBtn: { marginTop: 18 },
});
