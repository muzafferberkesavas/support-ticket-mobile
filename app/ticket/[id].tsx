import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  addReply,
  deleteTicket,
  getTicket,
  reopenTicket,
  submitCsat,
  uploadAttachment,
} from '@/api/tickets';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Banner, Button, Card, TextField } from '@/components/ui';
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/ticket';
import { colors, formatDateTime } from '@/theme';

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['ticket', id], queryFn: () => getTicket(id) });
  const t = query.data;
  const isOwner = !!t && !!user && t.userId === user.id;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['ticket', id] });
    await qc.invalidateQueries({ queryKey: ['tickets'] });
  };

  const replyMut = useMutation({
    mutationFn: () => addReply(id, reply.trim()),
    onSuccess: async () => {
      setReply('');
      void Haptics.selectionAsync();
      await refresh();
    },
    onError: (e) => setError(extractErrorMessage(e, 'Yanıt gönderilemedi.')),
  });

  const reopenMut = useMutation({
    mutationFn: () => reopenTicket(id),
    onSuccess: refresh,
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  const csatMut = useMutation({
    mutationFn: (rating: number) => submitCsat(id, rating),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTicket(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      router.back();
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  const uploadMut = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) => uploadAttachment(id, file),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    },
    onError: (e) => Alert.alert('Yükleme hatası', extractErrorMessage(e)),
  });

  function confirmDelete() {
    Alert.alert('Talebi sil', 'Bu talep kalıcı olarak silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMut.mutate() },
    ]);
  }

  // Kamera/galeri seçildikten sonra görseli talebe yükler (mobil özellik #2).
  async function pickImage(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Görsel eklemek için kamera/galeri izni vermelisiniz.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    const name = a.fileName || a.uri.split('/').pop() || `foto-${Date.now()}.jpg`;
    const type = a.mimeType || 'image/jpeg';
    uploadMut.mutate({ uri: a.uri, name, type });
  }

  function addPhoto() {
    Alert.alert('Görsel ekle', 'Kaynağı seçin', [
      { text: 'Kamera', onPress: () => void pickImage('camera') },
      { text: 'Galeri', onPress: () => void pickImage('library') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (query.isError || !t) {
    return (
      <View style={styles.pad}>
        <Banner text={extractErrorMessage(query.error, 'Talep yüklenemedi.')} />
      </View>
    );
  }

  const isClosed = t.status === 'closed';
  const replies = t.replies ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Talep',
          headerRight: () =>
            isOwner ? (
              <View style={styles.headerActions}>
                {!isClosed ? (
                  <Pressable onPress={() => router.push(`/edit/${id}`)} hitSlop={10}>
                    <Text style={styles.headerEdit}>Düzenle</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={confirmDelete} hitSlop={10}>
                  <Text style={styles.headerDelete}>🗑</Text>
                </Pressable>
              </View>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {error ? <Banner text={error} /> : null}

        {/* Başlık + rozetler */}
        <View style={styles.badgeRow}>
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
          <SlaBadge ticket={t} />
        </View>
        <Text style={styles.subject}>{t.subject}</Text>
        <Text style={styles.meta}>Oluşturulma: {formatDateTime(t.createdAt)}</Text>
        {t.category ? <Text style={styles.meta}>Kategori: {t.category}</Text> : null}
        {t.department ? <Text style={styles.meta}>Departman: {t.department.name}</Text> : null}
        {t.tags && t.tags.length > 0 ? (
          <View style={styles.tagWrap}>
            {t.tags.map((tag) => (
              <Badge key={tag} label={tag} fg={colors.info} bg={colors.infoBg} />
            ))}
          </View>
        ) : null}

        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>{t.message}</Text>
        </Card>

        {/* Ekler (mobil özellik: kamera/galeri) */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Ekler ({t.attachments?.length ?? 0})</Text>
          {!isClosed ? (
            <Pressable onPress={addPhoto} hitSlop={8} disabled={uploadMut.isPending}>
              <Text style={styles.addPhoto}>{uploadMut.isPending ? 'Yükleniyor…' : '📷 Görsel ekle'}</Text>
            </Pressable>
          ) : null}
        </View>
        {t.attachments && t.attachments.length > 0 ? (
          t.attachments.map((a) => (
            <Card key={a.id} style={styles.attachment}>
              <Text style={styles.attachName} numberOfLines={1}>
                {a.mimeType.startsWith('image/') ? '🖼' : '📎'} {a.filename}
              </Text>
              <Text style={styles.meta}>{bytes(a.size)}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.muted}>Henüz ek yok.</Text>
        )}

        {/* Kapalı talep için yeniden açma + CSAT */}
        {isClosed && isOwner ? (
          <Card style={styles.closedCard}>
            {t.csatRating == null ? (
              <>
                <Text style={styles.sectionTitle}>Bu çözümden memnun kaldınız mı?</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => csatMut.mutate(n)} disabled={csatMut.isPending} hitSlop={6}>
                      <Text style={styles.star}>☆</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.muted}>
                Değerlendirmeniz: {'★'.repeat(t.csatRating)}{'☆'.repeat(5 - t.csatRating)}
              </Text>
            )}
            <Button
              title="Talebi Yeniden Aç"
              variant="secondary"
              onPress={() => reopenMut.mutate()}
              loading={reopenMut.isPending}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : null}

        {/* Konuşma */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Yanıtlar ({replies.length})</Text>
        {replies.length === 0 ? <Text style={styles.muted}>Henüz yanıt yok.</Text> : null}
        {replies.map((r) => {
          const mine = r.authorId === user?.id;
          return (
            <View key={r.id} style={[styles.reply, mine ? styles.replyMine : styles.replyOther]}>
              <Text style={styles.replyAuthor}>
                {r.author.fullName || r.author.email} {mine ? '(siz)' : ''}
              </Text>
              <Text style={styles.replyText}>{r.message}</Text>
              <Text style={styles.replyTime}>{formatDateTime(r.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Yanıt yazma */}
      {!isClosed ? (
        <View style={styles.composer}>
          <TextField
            value={reply}
            onChangeText={setReply}
            placeholder="Yanıtınızı yazın…"
            multiline
            containerStyle={styles.composerInput}
            style={{ minHeight: 44, maxHeight: 110 }}
          />
          <Button
            title="Gönder"
            onPress={() => reply.trim() && replyMut.mutate()}
            loading={replyMut.isPending}
            disabled={!reply.trim()}
            style={styles.composerBtn}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pad: { padding: 16 },
  container: { padding: 16, paddingBottom: 24 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerEdit: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  headerDelete: { fontSize: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  subject: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  messageCard: { marginTop: 14, backgroundColor: colors.surfaceAlt },
  messageText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addPhoto: { color: colors.primary, fontWeight: '700' },
  attachment: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 12 },
  attachName: { flex: 1, fontSize: 14, color: colors.text, marginRight: 8 },
  closedCard: { marginTop: 18, backgroundColor: colors.surfaceAlt },
  stars: { flexDirection: 'row', gap: 8, marginTop: 8 },
  star: { fontSize: 34, color: colors.warn },
  reply: { borderRadius: 12, padding: 12, marginTop: 8, maxWidth: '92%' },
  replyMine: { backgroundColor: colors.infoBg, alignSelf: 'flex-end' },
  replyOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  replyAuthor: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  replyText: { fontSize: 15, color: colors.text, marginTop: 4 },
  replyTime: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerInput: { flex: 1, marginBottom: 0 },
  composerBtn: { height: 48 },
});
