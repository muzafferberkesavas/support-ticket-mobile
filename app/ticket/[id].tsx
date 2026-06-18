import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  addReply,
  assignTicket,
  deleteTicket,
  escalateTicket,
  getTicket,
  reopenTicket,
  submitCsat,
  updateTicket,
  uploadAttachment,
} from '@/api/tickets';
import { listUsers } from '@/api/users';
import { extractErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { isStaffRole, ROLE_LABELS } from '@/auth/roles';
import { Badge, Banner, Button, Card, TextField } from '@/components/ui';
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/ticket';
import { Icon } from '@/components/Icon';
import { socket } from '@/realtime/socket';
import { colors, formatDateTime, STATUS_META, STATUS_VALUES } from '@/theme';

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isStaff, isAdmin } = useAuth();
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSel, setAssignSel] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['ticket', id], queryFn: () => getTicket(id) });
  const t = query.data;
  const isOwner = !!t && !!user && t.userId === user.id;

  // Atama adayları: talebin departmanındaki personel (yoksa tüm personel).
  const usersQuery = useQuery({
    queryKey: ['assignable-users', t?.departmentId ?? 'all'],
    queryFn: () => listUsers(t?.departmentId ? { departmentId: t.departmentId } : {}),
    enabled: isStaff && assignOpen,
  });
  const candidates = useMemo(
    () => (usersQuery.data ?? []).filter((u) => isStaffRole(u.role)),
    [usersQuery.data],
  );

  // Bu talebin canlı konuşmasına abone ol → yeni yanıt geldiğinde anında tazele.
  useEffect(() => {
    if (!id) return;
    socket.emit('ticket:subscribe', id);
    const onReply = (p: { ticketId: string }) => {
      if (p?.ticketId === id) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void qc.invalidateQueries({ queryKey: ['ticket', id] });
      }
    };
    socket.on('ticket:reply', onReply);
    return () => {
      socket.off('ticket:reply', onReply);
      socket.emit('ticket:unsubscribe', id);
    };
  }, [id, qc]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['ticket', id] });
    await qc.invalidateQueries({ queryKey: ['tickets'] });
  };

  const replyMut = useMutation({
    mutationFn: () => addReply(id, reply.trim(), isInternal),
    onSuccess: async () => {
      setReply('');
      setIsInternal(false);
      void Haptics.selectionAsync();
      await refresh();
    },
    onError: (e) => setError(extractErrorMessage(e, 'Yanıt gönderilemedi.')),
  });

  // Personel: durum değiştir.
  const statusMut = useMutation({
    mutationFn: (status: typeof STATUS_VALUES[number]) => updateTicket(id, { status }),
    onSuccess: async () => {
      void Haptics.selectionAsync();
      await refresh();
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  // Personel: atama kaydet.
  const assignMut = useMutation({
    mutationFn: () => assignTicket(id, assignSel),
    onSuccess: async () => {
      setAssignOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  // Personel: yükselt (escalate).
  const escalateMut = useMutation({
    mutationFn: () => escalateTicket(id),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await refresh();
    },
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  function openAssign() {
    setAssignSel((t?.assignees ?? []).map((a) => a.user.id));
    setAssignOpen(true);
  }
  function toggleAssignee(uid: string) {
    setAssignSel((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }

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
            isOwner || isAdmin ? (
              <View style={styles.headerActions}>
                {isOwner && !isClosed ? (
                  <Pressable onPress={() => router.push(`/edit/${id}`)} hitSlop={10}>
                    <Icon name="create-outline" size={22} color="#fff" />
                  </Pressable>
                ) : null}
                <Pressable onPress={confirmDelete} hitSlop={10}>
                  <Icon name="trash-outline" size={21} color="#fecaca" />
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

        {/* Personel yönetim kartı (yalnızca staff) */}
        {isStaff ? (
          <Card style={styles.staffCard}>
            <View style={styles.staffHead}>
              <Icon name="construct-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Personel</Text>
            </View>

            <Text style={styles.staffLabel}>Durum</Text>
            <View style={styles.statusRow}>
              {STATUS_VALUES.map((s) => {
                const active = t.status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => !active && statusMut.mutate(s)}
                    disabled={statusMut.isPending}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                      {STATUS_META[s].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.staffLabelRow}>
              <Text style={styles.staffLabel}>Atananlar</Text>
              <Pressable onPress={assignOpen ? () => setAssignOpen(false) : openAssign} hitSlop={8}>
                <Text style={styles.linkText}>{assignOpen ? 'Vazgeç' : 'Düzenle'}</Text>
              </Pressable>
            </View>
            {!assignOpen ? (
              <Text style={styles.muted}>
                {t.assignees && t.assignees.length
                  ? t.assignees.map((a) => a.user.fullName || a.user.email).join(', ')
                  : 'Atanmamış'}
              </Text>
            ) : (
              <View>
                {usersQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                ) : candidates.length === 0 ? (
                  <Text style={styles.muted}>Bu departmanda personel bulunamadı.</Text>
                ) : (
                  candidates.map((u) => {
                    const sel = assignSel.includes(u.id);
                    return (
                      <Pressable key={u.id} onPress={() => toggleAssignee(u.id)} style={styles.assignRow}>
                        <Icon
                          name={sel ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={sel ? colors.primary : colors.textMuted}
                        />
                        <View style={styles.flex1}>
                          <Text style={styles.assignName}>{u.fullName || u.email}</Text>
                          <Text style={styles.assignRole}>{ROLE_LABELS[u.role]}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
                <Button
                  title="Atamayı Kaydet"
                  onPress={() => assignMut.mutate()}
                  loading={assignMut.isPending}
                  style={{ marginTop: 10 }}
                />
              </View>
            )}

            {t.escalated ? (
              <View style={styles.escalatedRow}>
                <Icon name="alert-circle" size={15} color="#b91c1c" />
                <Text style={styles.escalatedText}>Bu talep yükseltildi.</Text>
              </View>
            ) : !isClosed ? (
              <Button
                title="Talebi Yükselt"
                variant="secondary"
                icon="arrow-up-circle-outline"
                onPress={() => escalateMut.mutate()}
                loading={escalateMut.isPending}
                style={{ marginTop: 14 }}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Ekler (mobil özellik: kamera/galeri) */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Ekler ({t.attachments?.length ?? 0})</Text>
          {!isClosed ? (
            <Pressable onPress={addPhoto} hitSlop={8} disabled={uploadMut.isPending} style={styles.addPhotoBtn}>
              <Icon name="camera-outline" size={16} color={colors.primary} />
              <Text style={styles.addPhoto}>{uploadMut.isPending ? 'Yükleniyor…' : 'Görsel ekle'}</Text>
            </Pressable>
          ) : null}
        </View>
        {t.attachments && t.attachments.length > 0 ? (
          t.attachments.map((a) => (
            <Card key={a.id} style={styles.attachment}>
              <View style={styles.attachLeft}>
                <Icon
                  name={a.mimeType.startsWith('image/') ? 'image-outline' : 'document-outline'}
                  size={18}
                  color={colors.textMuted}
                />
                <Text style={styles.attachName} numberOfLines={1}>
                  {a.filename}
                </Text>
              </View>
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
                      <Icon name="star-outline" size={34} color={colors.warn} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.ratedRow}>
                <Text style={styles.muted}>Değerlendirmeniz:</Text>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon key={n} name={n <= t.csatRating! ? 'star' : 'star-outline'} size={18} color={colors.warn} />
                ))}
              </View>
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
          const staffAuthor = isStaffRole(r.author.role);
          return (
            <View
              key={r.id}
              style={[styles.reply, r.isInternal ? styles.replyInternal : mine ? styles.replyMine : styles.replyOther]}
            >
              <View style={styles.replyHead}>
                <Text style={styles.replyAuthor}>
                  {r.author.fullName || r.author.email}
                  {mine ? ' (siz)' : ''}
                </Text>
                {staffAuthor ? <Badge label={ROLE_LABELS[r.author.role]} fg={colors.primary} bg={colors.primarySoft} /> : null}
                {r.isInternal ? <Badge label="Dahili" fg="#b45309" bg="#fef3c7" /> : null}
              </View>
              <Text style={styles.replyText}>{r.message}</Text>
              <Text style={styles.replyTime}>{formatDateTime(r.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Yanıt yazma */}
      {!isClosed ? (
        <View style={styles.composerWrap}>
          {isStaff ? (
            <Pressable style={styles.internalToggle} onPress={() => setIsInternal((v) => !v)}>
              <Switch
                value={isInternal}
                onValueChange={setIsInternal}
                trackColor={{ true: colors.warn, false: colors.border }}
                thumbColor="#fff"
              />
              <Text style={styles.internalLabel}>Dahili not (yalnızca personel görür)</Text>
            </Pressable>
          ) : null}
          <View style={styles.composer}>
            <TextField
              value={reply}
              onChangeText={setReply}
              placeholder={isInternal ? 'Dahili not yazın…' : 'Yanıtınızı yazın…'}
              multiline
              containerStyle={styles.composerInput}
              style={{ minHeight: 44, maxHeight: 110 }}
            />
            <Button
              title={isInternal ? 'Not' : 'Gönder'}
              icon={isInternal ? 'lock-closed' : 'send'}
              onPress={() => reply.trim() && replyMut.mutate()}
              loading={replyMut.isPending}
              disabled={!reply.trim()}
              style={styles.composerBtn}
            />
          </View>
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
  flex1: { flex: 1 },
  staffCard: { marginTop: 14, borderColor: colors.primarySoft, borderWidth: 1.5 },
  staffHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  staffLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  staffLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  statusChipTextActive: { color: colors.white },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  assignName: { fontSize: 14, fontWeight: '600', color: colors.text },
  assignRole: { fontSize: 12, color: colors.textMuted },
  escalatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  escalatedText: { fontSize: 13, fontWeight: '700', color: '#b91c1c' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addPhoto: { color: colors.primary, fontWeight: '700' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attachLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  attachment: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 12 },
  attachName: { flex: 1, fontSize: 14, color: colors.text, marginRight: 8 },
  closedCard: { marginTop: 18, backgroundColor: colors.surfaceAlt },
  stars: { flexDirection: 'row', gap: 8, marginTop: 8 },
  star: { fontSize: 34, color: colors.warn },
  reply: { borderRadius: 12, padding: 12, marginTop: 8, maxWidth: '92%' },
  replyMine: { backgroundColor: colors.infoBg, alignSelf: 'flex-end' },
  replyOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  replyInternal: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  replyAuthor: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  replyText: { fontSize: 15, color: colors.text, marginTop: 4 },
  replyTime: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  composerWrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  internalToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  internalLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
  },
  composerInput: { flex: 1, marginBottom: 0 },
  composerBtn: { height: 48 },
});
