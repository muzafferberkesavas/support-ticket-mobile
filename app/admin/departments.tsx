import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from '@/api/departments';
import { listUsers } from '@/api/users';
import { extractErrorMessage } from '@/api/client';
import { isStaffRole, ROLE_LABELS } from '@/auth/roles';
import { Banner, Button, Card, EmptyState, TextField } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SelectList } from '@/components/SelectList';
import { colors } from '@/theme';
import type { Department } from '@/types';

interface FormState {
  name: string;
  description: string;
  memberIds: string[];
}
const EMPTY_FORM: FormState = { name: '', description: '', memberIds: [] };

export default function DepartmentsScreen() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);

  const deptsQuery = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const staffQuery = useQuery({ queryKey: ['staff-users'], queryFn: () => listUsers(), enabled: modal });

  const departments = deptsQuery.data ?? [];
  const memberOptions = useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((u) => isStaffRole(u.role))
        .map((u) => ({ id: u.id, label: u.fullName || u.email, sub: ROLE_LABELS[u.role] })),
    [staffQuery.data],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        memberIds: form.memberIds,
      };
      return editing ? updateDepartment(editing.id, payload) : createDepartment(payload);
    },
    onSuccess: async () => {
      setModal(false);
      await invalidate();
    },
    onError: (e) => setErr(extractErrorMessage(e, 'Kaydedilemedi.')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Hata', extractErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErr(null);
    setModal(true);
  }
  function openEdit(d: Department) {
    setEditing(d);
    setForm({
      name: d.name,
      description: d.description ?? '',
      memberIds: (d.members ?? []).map((m) => m.user.id),
    });
    setErr(null);
    setModal(true);
  }
  function confirmDelete(d: Department) {
    Alert.alert('Departmanı sil', `${d.name} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMut.mutate(d.id) },
    ]);
  }
  function toggleMember(id: string) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id],
    }));
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Departmanlar',
          headerRight: () => (
            <Pressable onPress={openCreate} hitSlop={10}>
              <Icon name="add-circle" size={26} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {deptsQuery.isError ? <View style={styles.pad}><Banner text={extractErrorMessage(deptsQuery.error)} /></View> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={deptsQuery.isFetching} onRefresh={() => deptsQuery.refetch()} />}
      >
        {departments.length === 0 && !deptsQuery.isLoading ? (
          <EmptyState title="Departman yok" subtitle="＋ ile ilk departmanı oluşturun." icon="git-network-outline" />
        ) : null}
        {departments.map((d) => {
          const members = (d.members ?? []).map((m) => m.user.fullName || m.user.email);
          return (
            <Card key={d.id} style={styles.deptCard}>
              <View style={styles.deptTop}>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{d.name}</Text>
                  {d.description ? <Text style={styles.desc}>{d.description}</Text> : null}
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{d._count?.tickets ?? 0}</Text>
                  <Text style={styles.countLabel}>talep</Text>
                </View>
              </View>
              <View style={styles.metaItem}>
                <Icon name="people-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={2}>
                  {members.length ? members.join(', ') : 'Üye yok'}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button title="Düzenle" variant="secondary" icon="create-outline" onPress={() => openEdit(d)} style={styles.actionBtn} />
                <Button title="Sil" variant="danger" icon="trash-outline" onPress={() => confirmDelete(d)} style={styles.actionBtn} />
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editing ? 'Departmanı Düzenle' : 'Yeni Departman'}</Text>
                <Pressable onPress={() => setModal(false)} hitSlop={10}>
                  <Icon name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              {err ? <Banner text={err} /> : null}

              <TextField
                label="Ad"
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="ör. Teknik Destek"
              />
              <TextField
                label="Açıklama"
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="(isteğe bağlı)"
                multiline
                style={styles.descInput}
              />

              <Text style={styles.label}>Üyeler (personel)</Text>
              <SelectList
                options={memberOptions}
                selected={form.memberIds}
                onToggle={toggleMember}
                empty="Personel bulunamadı."
              />

              <Button
                title={editing ? 'Kaydet' : 'Oluştur'}
                onPress={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={!form.name.trim()}
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
  flex1: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
  deptCard: { marginBottom: 12 },
  deptTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  countBadge: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  countText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  countLabel: { fontSize: 10, color: colors.textMuted },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,18,30,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  descInput: { minHeight: 64, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 14, marginBottom: 8 },
  saveBtn: { marginTop: 18 },
});
